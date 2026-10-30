import { ssh } from './ssh'
import { env } from './env'

export const alicePassword = 'Password1'

export function addUser(username: string, password: string) {
  ssh(`snap run platform.cli user add ${username} --password ${password} --email ${username}@${env('PLAYWRIGHT_FULL_DOMAIN')}`)
}
