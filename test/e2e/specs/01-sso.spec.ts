import { test, expect } from '../fixtures'
import { shoot } from '../helpers/screenshot'
import { env } from '../helpers/env'
import { addUser } from '../helpers/users'
import { goHome, openApp, signIn, signOut } from '../helpers/joplin'
import { connectApp, publishFolder, publishNote, syncFolder, syncNote } from '../helpers/app'

const admin = env('PLAYWRIGHT_DEVICE_USER')
const adminPassword = env('PLAYWRIGHT_DEVICE_PASSWORD')
const password = 'Password1'

const groceries = { id: 'a1000000000000000000000000000001', title: 'Groceries' }
const shopping = {
  id: 'a1000000000000000000000000000002',
  parentId: groceries.id,
  title: 'Shopping list',
  body: '# Saturday market\n\n- [ ] Milk\n- [x] Eggs\n- [ ] **Sourdough** bread',
}
const recipe = {
  id: 'a1000000000000000000000000000003',
  parentId: groceries.id,
  title: 'Pancake recipe',
  body: '## Ingredients\n\n| Item | Amount |\n|------|--------|\n| Flour | 200 g |\n| Milk | 300 ml |\n\n> Rest the batter for 30 minutes.',
}

test('syncloud users sign in to joplin server through SSO', async ({ page }) => {
  addUser('alice', password)

  await test.step('admin signs in and lands on the admin dashboard', async () => {
    await openApp(page)
    await signIn(page, admin, adminPassword)
    await expect(page.getByRole('heading', { name: 'Joplin Server admin dashboard' })).toBeVisible()
    await shoot(page, 'admin-dashboard')
  })

  await test.step('admin sees the user list', async () => {
    await page.getByRole('link', { name: 'Users', exact: true }).click()
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('table').getByText('admin@localhost')).toHaveCount(0)
    await shoot(page, 'admin-users')
  })

  await test.step('admin opens the home page', async () => {
    await goHome(page)
    await shoot(page, 'admin-home')
  })

  await test.step('a regular user is not an admin', async () => {
    await signOut(page)
    await signIn(page, 'alice', password)
    await expect(page.getByRole('heading', { name: 'Welcome to Joplin Server' })).toBeVisible()
    await expect(page.locator('.navbar').getByRole('link', { name: 'Admin', exact: true })).toBeHidden()
    await shoot(page, 'alice-home')
  })

  let session = ''

  await test.step('alice connects the Joplin app through SSO', async () => {
    session = await connectApp(page, 'alice-app-code')
  })

  await test.step('the Joplin app syncs a notebook with notes', async () => {
    await syncFolder(page, session, groceries)
    await syncNote(page, session, shopping)
    await syncNote(page, session, recipe)
  })

  await test.step('alice publishes a note and opens its public link', async () => {
    await page.goto(await publishNote(page, session, shopping.id))
    await expect(page.getByRole('heading', { name: 'Saturday market' })).toBeVisible()
    await expect(page.getByText('Sourdough')).toBeVisible()
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(3)
    await shoot(page, 'published-note')
  })

  await test.step('alice publishes the notebook and browses it', async () => {
    await page.goto(await publishFolder(page, session, groceries.id))
    const tree = page.locator('#folder-tree')
    await expect(tree.getByRole('treeitem', { name: shopping.title })).toBeVisible()
    await expect(tree.getByRole('treeitem', { name: recipe.title })).toBeVisible()
    await shoot(page, 'published-notebook')
    await tree.getByRole('treeitem', { name: recipe.title }).click()
    await expect(page.getByRole('heading', { name: 'Ingredients' })).toBeVisible()
    await expect(page.getByRole('cell', { name: '200 g' })).toBeVisible()
    await expect(page.getByText('Rest the batter for 30 minutes.')).toBeVisible()
    await shoot(page, 'published-notebook-note')
  })
})
