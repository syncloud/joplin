import time


def wait_for_socket(device, app):
    for _ in range(60):
        if device.run_ssh('test -S /var/snap/{0}/current/joplin.sock && echo ready'.format(app), throw=False).strip() == 'ready':
            return
        time.sleep(5)
    raise AssertionError('{0} did not create its socket within 5 minutes'.format(app))


def settle(device):
    device.run_ssh('snap wait system seed.loaded', retries=100, throw=False)
    device.run_ssh('snap set system refresh.hold=2099-01-01T00:00:00Z', retries=20, throw=False)
    device.run_ssh('snap abort --last=auto-refresh', throw=False)
    device.run_ssh('snap watch --last=auto-refresh', throw=False)


def assert_no_restarts(device, app):
    for service in ['joplin', 'nginx']:
        restarts = device.run_ssh('systemctl show -p NRestarts --value snap.{0}.{1}.service'.format(app, service))
        assert restarts.strip() == '0', '{0}.{1} was restarted {2} times'.format(app, service, restarts.strip())
