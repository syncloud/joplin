import { Page, expect } from '@playwright/test'
import { shoot } from './screenshot'
import { Folder } from './folder'
import { Note } from './note'
import { ShareRequest } from './shareRequest'

const timestamp = '2026-10-29T10:00:00.000Z'

function serializeFolder(folder: Folder): string {
  return [
    folder.title,
    '',
    `id: ${folder.id}`,
    `created_time: ${timestamp}`,
    `updated_time: ${timestamp}`,
    `user_created_time: ${timestamp}`,
    `user_updated_time: ${timestamp}`,
    'encryption_cipher_text: ',
    'encryption_applied: 0',
    'parent_id: ',
    'is_shared: 0',
    'share_id: ',
    'type_: 2',
  ].join('\n')
}

function serializeNote(note: Note): string {
  return [
    note.title,
    '',
    note.body,
    '',
    `id: ${note.id}`,
    `parent_id: ${note.parentId}`,
    `created_time: ${timestamp}`,
    `updated_time: ${timestamp}`,
    'is_conflict: 0',
    'is_todo: 0',
    'todo_due: 0',
    'todo_completed: 0',
    'source: joplin-desktop',
    'source_application: net.cozic.joplin-desktop',
    'order: 0',
    `user_created_time: ${timestamp}`,
    `user_updated_time: ${timestamp}`,
    'encryption_cipher_text: ',
    'encryption_applied: 0',
    'markup_language: 1',
    'is_shared: 0',
    'share_id: ',
    'deleted_time: 0',
    'type_: 1',
  ].join('\n')
}

export async function connectApp(page: Page, screenshot: string): Promise<string> {
  await page.goto('/login/sso-saml-app')
  await expect(page.getByRole('heading', { name: 'Successfully logged into your Syncloud account!' })).toBeVisible()
  await shoot(page, screenshot)
  const code = (await page.locator('.is-family-monospace').innerText()).replace(/\D/g, '')
  const response = await page.request.get(`/api/login_with_code/${code}`)
  expect(response.status()).toBe(200)
  return (await response.json()).id
}

async function upload(page: Page, session: string, id: string, content: string) {
  const response = await page.request.put(`/api/items/root:/${id}.md:/content`, {
    headers: { 'X-API-AUTH': session, 'Content-Type': 'application/octet-stream' },
    data: Buffer.from(content),
  })
  expect(response.status(), await response.text()).toBe(200)
}

export async function syncFolder(page: Page, session: string, folder: Folder) {
  await upload(page, session, folder.id, serializeFolder(folder))
}

export async function syncNote(page: Page, session: string, note: Note) {
  await upload(page, session, note.id, serializeNote(note))
}

async function share(page: Page, session: string, data: ShareRequest): Promise<string> {
  const response = await page.request.post('/api/shares', {
    headers: { 'X-API-AUTH': session },
    data,
  })
  expect(response.status(), await response.text()).toBe(200)
  return `/shares/${(await response.json()).id}`
}

export async function publishNote(page: Page, session: string, noteId: string): Promise<string> {
  return share(page, session, { note_id: noteId })
}

export async function publishFolder(page: Page, session: string, folderId: string): Promise<string> {
  return share(page, session, { folder_id: folderId, type: 4 })
}
