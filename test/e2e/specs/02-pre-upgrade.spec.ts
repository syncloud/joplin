import { test, expect } from '../fixtures'
import { shoot } from '../helpers/screenshot'
import { env } from '../helpers/env'
import { openApp, signIn, signOut } from '../helpers/joplin'
import { alicePassword } from '../helpers/users'
import { connectApp, publishNote, syncFolder, syncNote } from '../helpers/app'
import { journal, upgradeNote } from '../helpers/upgrade'

test('users sync and publish a note on the store version', async ({ page }) => {
  await openApp(page)
  await signIn(page, 'alice', alicePassword)
  await signOut(page)
  await signIn(page, env('PLAYWRIGHT_DEVICE_USER'), env('PLAYWRIGHT_DEVICE_PASSWORD'))

  await page.getByRole('link', { name: 'Users', exact: true }).click()
  await expect(page.locator('table').getByRole('link', { name: 'alice', exact: true })).toBeVisible()
  await shoot(page, 'users-before-upgrade')

  const session = await connectApp(page, 'admin-app-code')
  await syncFolder(page, session, journal)
  await syncNote(page, session, upgradeNote)

  await openApp(page)
  await page.locator('.navbar').getByRole('link', { name: 'Items', exact: true }).click()
  await expect(page.getByRole('link', { name: `${upgradeNote.id}.md` })).toBeVisible()
  await shoot(page, 'items-before-upgrade')

  await page.goto(await publishNote(page, session, upgradeNote.id))
  await expect(page.getByText(upgradeNote.body)).toBeVisible()
  await shoot(page, 'published-before-upgrade')
})
