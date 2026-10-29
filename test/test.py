import json
from os.path import dirname, join
from subprocess import check_output

import pytest
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from syncloudlib.http import wait_for_rest
from syncloudlib.integration.hosts import add_host_alias
from syncloudlib.integration.installer import local_install

from settle import settle, assert_no_restarts, wait_for_socket

DIR = dirname(__file__)
TMP_DIR = '/tmp/syncloud'
APP = 'joplin'

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


@pytest.fixture(scope="session")
def module_setup(request, device, artifact_dir):
    def module_teardown():
        device.run_ssh('ls -la /var/snap/{0}/current > {1}/var.current.ls.log'.format(APP, TMP_DIR), throw=False)
        device.run_ssh('ls -la /var/snap/{0}/current/config > {1}/var.current.config.ls.log'.format(APP, TMP_DIR), throw=False)
        device.run_ssh('ls -la /var/snap/{0}/common > {1}/var.common.ls.log'.format(APP, TMP_DIR), throw=False)
        device.run_ssh('cp /var/snap/{0}/current/config/nginx.conf {1}/nginx.conf.log'.format(APP, TMP_DIR), throw=False)
        device.run_ssh('cat /var/snap/platform/current/config/authelia/config.yml > {0}/authelia.config.yml.log'.format(TMP_DIR), throw=False)
        device.run_ssh('systemctl status snap.{0}.* --no-pager > {1}/systemctl.status.log'.format(APP, TMP_DIR), throw=False)
        device.run_ssh('journalctl -u snap.{0}.joplin -u snap.{0}.nginx --no-pager > {1}/joplin.journal.log'.format(APP, TMP_DIR), throw=False)
        device.run_ssh('top -bn 1 -w 500 -c > {0}/top.log'.format(TMP_DIR), throw=False)
        device.run_ssh('ps auxfw > {0}/ps.log'.format(TMP_DIR), throw=False)
        device.run_ssh('netstat -nlp > {0}/netstat.log'.format(TMP_DIR), throw=False)
        device.run_ssh('journalctl | tail -3000 > {0}/journalctl.log'.format(TMP_DIR), throw=False)
        device.scp_from_device('{0}/*'.format(TMP_DIR), artifact_dir)
        check_output('chmod -R a+r {0}'.format(artifact_dir), shell=True)

    request.addfinalizer(module_teardown)


def test_start(module_setup, device, device_host, app, domain):
    add_host_alias(app, device_host, domain)
    device.run_ssh('date', retries=100)
    device.run_ssh('mkdir -p {0}'.format(TMP_DIR))
    device.scp_to_device(join(DIR, 'marker.js'), TMP_DIR, throw=True)
    settle(device)


@pytest.mark.flaky(retries=50, delay=10)
def test_activate_device(device):
    device.run_ssh('rm -f /var/snap/platform/current/syncloud.crt', throw=False)
    response = device.activate_custom()
    assert response.status_code == 200, response.text


def test_install(app_archive_path, device_host, device_password, device):
    settle(device)
    local_install(device_host, device_password, app_archive_path)


def test_socket(device):
    wait_for_socket(device, APP)


def test_services_started_cleanly(device):
    assert_no_restarts(device, APP)


def test_native_module_loads(device):
    path = '/snap/{0}/current/joplin/packages/server/node_modules/sqlite3'.format(APP)
    device.run_ssh(r'/snap/{0}/current/node/node.sh -e require\(process.argv[1]\) {1}'.format(APP, path))


def test_env_not_world_readable(device):
    mode = device.run_ssh('stat -c %a /var/snap/{0}/current/config/joplin.env'.format(APP))
    assert mode.strip() == '600'


def test_index(app_domain):
    wait_for_rest(requests.session(), "https://{0}".format(app_domain), 200, 100)


def test_api_ping(app_domain):
    response = requests.get('https://{0}/api/ping'.format(app_domain), verify=False)
    assert response.status_code == 200, response.text
    assert response.json()['status'] == 'ok'


@pytest.mark.parametrize('path', ['/login', '/login/sso-oidc', '/login/sso-saml-app'])
def test_login_redirects_to_authelia(app_domain, domain, path):
    response = requests.get('https://{0}{1}'.format(app_domain, path), verify=False, allow_redirects=False)
    assert response.status_code == 302, response.text
    assert response.headers['Location'].startswith('https://auth.{0}/'.format(domain))
    assert 'scope=openid+profile+email+groups' in response.headers['Location']
    assert 'code_challenge_method=S256' in response.headers['Location']


def test_password_login_disabled(app_domain):
    response = requests.post('https://{0}/api/sessions'.format(app_domain), json={'email': 'admin@localhost', 'password': 'admin'}, verify=False)
    assert response.status_code == 403, response.text


def test_access_change(device):
    device.run_ssh('snap run {0}.access-change > {1}/access-change.log'.format(APP, TMP_DIR))


def test_index_after_access_change(app_domain):
    wait_for_rest(requests.session(), "https://{0}".format(app_domain), 200, 100)


def test_backup(device, artifact_dir):
    set_marker(device, 'before')
    out = device.run_ssh('snap run platform.cli backup create {0}'.format(APP), throw=False)
    response = device.run_ssh('snap run platform.cli backup list')
    open('{0}/cli.backup.list.json'.format(artifact_dir), 'w').write(response)
    backups = [b for b in json.loads(response) if b['app'] == APP]
    assert backups, 'backup create failed:\n{0}'.format(out)
    backup = backups[-1]
    entries = device.run_ssh('tar tzf {0}/{1}'.format(backup['path'], backup['file'])).split()
    open('{0}/backup.tar.list.log'.format(artifact_dir), 'w').write('\n'.join(entries))
    for entry in ['./current/joplin.sqlite', './current/config/joplin.env', './current/version', './common']:
        assert entry in entries, 'backup {0} has no {1}:\n{2}'.format(backup['file'], entry, out)


def test_restore(device, app_domain):
    backup = latest_backup(device)
    set_marker(device, 'after')
    device.run_ssh('snap run platform.cli backup restore {0}'.format(backup['file']))
    wait_for_rest(requests.session(), "https://{0}".format(app_domain), 200, 100)
    wait_for_socket(device, APP)
    assert get_marker(device) == 'before'


def test_restore_backup_from_older_build(device, app_domain):
    backup = latest_backup(device)
    archive = '{0}/{1}'.format(backup['path'], backup['file'])
    device.run_ssh("sh -c 'rm -rf {0}/old && mkdir {0}/old && cd {0}/old && tar xzf {1} && echo 1 > current/version && tar czf {1} .'".format(TMP_DIR, archive))
    set_marker(device, 'after')
    device.run_ssh('snap run platform.cli backup restore {0}'.format(backup['file']))
    wait_for_rest(requests.session(), "https://{0}".format(app_domain), 200, 100)
    wait_for_socket(device, APP)
    assert get_marker(device) == 'before'
    assert device.run_ssh('cat /var/snap/{0}/current/version'.format(APP)) == device.run_ssh('cat /snap/{0}/current/version'.format(APP))


def latest_backup(device):
    return [b for b in json.loads(device.run_ssh('snap run platform.cli backup list')) if b['app'] == APP][-1]


def marker(device, *args):
    return device.run_ssh('/snap/{0}/current/node/node.sh {1}/marker.js /snap/{0}/current/joplin/packages/server/node_modules/sqlite3 /var/snap/{0}/current/joplin.sqlite {2}'.format(APP, TMP_DIR, ' '.join(args))).strip()


def set_marker(device, value):
    marker(device, 'set', value)
    assert get_marker(device) == value


def get_marker(device):
    return marker(device, 'get')


def test_remove(device, app):
    response = device.app_remove(app)
    assert response.status_code == 200, response.text


def test_reinstall(app_archive_path, device_host, device_password, app_domain):
    local_install(device_host, device_password, app_archive_path)
    wait_for_rest(requests.session(), "https://{0}".format(app_domain), 200, 100)


def test_services_started_cleanly_after_reinstall(device):
    wait_for_socket(device, APP)
    assert_no_restarts(device, APP)
