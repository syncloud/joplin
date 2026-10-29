import { Page, expect } from '@playwright/test'
import { env } from './env'

const deviceUrl = `https://${env('PLAYWRIGHT_FULL_DOMAIN')}`

export async function openApp(page: Page) {
  await page.goto('/')
}

export async function signIn(page: Page, username: string, password: string) {
  const usernameField = page.locator('#username-textfield')
  await expect(usernameField).toBeVisible()
  await usernameField.fill(username)
  await page.locator('#password-textfield').fill(password)
  await page.locator('#sign-in-button').click()
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
}

export async function signOut(page: Page) {
  await page.goto(deviceUrl)
  await page.locator('#logout').click()
  await expect(page.locator('#username-textfield')).toBeVisible()
  await openApp(page)
  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page.locator('#username-textfield')).toBeVisible()
}

export async function goHome(page: Page) {
  await page.locator('.navbar').getByRole('link', { name: 'Home', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Welcome to Joplin Server' })).toBeVisible()
}
