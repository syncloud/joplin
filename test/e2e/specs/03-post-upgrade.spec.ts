import { test, expect } from '../fixtures'
import { shoot } from '../helpers/screenshot'
import { env } from '../helpers/env'
import { openApp, signIn } from '../helpers/joplin'
import { connectApp, publishNote } from '../helpers/app'
import { upgradeNote } from '../helpers/upgrade'

test('users, notes and published links survive the upgrade', async ({ page }) => {
  await openApp(page)
  await signIn(page, env('PLAYWRIGHT_DEVICE_USER'), env('PLAYWRIGHT_DEVICE_PASSWORD'))

  await page.getByRole('link', { name: 'Users', exact: true }).click()
  await expect(page.locator('table').getByRole('link', { name: 'alice', exact: true })).toBeVisible()
  await shoot(page, 'users-after-upgrade')

  await page.locator('.navbar').getByRole('link', { name: 'Items', exact: true }).click()
  await expect(page.getByRole('link', { name: `${upgradeNote.id}.md` })).toBeVisible()
  await shoot(page, 'items-after-upgrade')

  const session = await connectApp(page, 'admin-app-code-after-upgrade')
  await page.goto(await publishNote(page, session, upgradeNote.id))
  await expect(page.getByText(upgradeNote.body)).toBeVisible()
  await shoot(page, 'published-after-upgrade')
})
