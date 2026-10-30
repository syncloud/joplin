from subprocess import check_output

import pytest
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from syncloudlib.http import wait_for_rest
from syncloudlib.integration.hosts import add_host_alias

from settle import settle, wait_for_socket

TMP_DIR = '/tmp/syncloud'
APP = 'joplin'

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


@pytest.fixture(scope="session")
def module_setup(request, device, artifact_dir):
    def module_teardown():
        device.run_ssh('mkdir -p {0}'.format(TMP_DIR), throw=False)
        device.run_ssh('journalctl | tail -3000 > {0}/upgrade-prev.journalctl.log'.format(TMP_DIR), throw=False)
        device.scp_from_device('{0}/*'.format(TMP_DIR), artifact_dir, throw=False)
        check_output('chmod -R a+r {0}'.format(artifact_dir), shell=True)

    request.addfinalizer(module_teardown)


def test_start(module_setup, device, device_host, app, domain):
    add_host_alias(app, device_host, domain)
    device.activated()
    device.run_ssh('mkdir -p {0}'.format(TMP_DIR), throw=False)
    settle(device)


def test_install_store(device, app_domain):
    device.run_ssh('snap remove {0}'.format(APP))
    device.run_ssh('snap install {0}'.format(APP), retries=10)
    assert APP in device.run_ssh('snap list {0}'.format(APP))
    wait_for_rest(requests.session(), "https://{0}".format(app_domain), 200, 100)


def test_socket(device):
    wait_for_socket(device, APP)
