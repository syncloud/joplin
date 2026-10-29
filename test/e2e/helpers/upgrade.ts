import { Folder } from './folder'
import { Note } from './note'

export const journal: Folder = { id: 'b1000000000000000000000000000001', title: 'Journal' }

export const upgradeNote: Note = {
  id: 'b1000000000000000000000000000002',
  parentId: journal.id,
  title: 'Written before the upgrade',
  body: 'This note was synced before the snap was refreshed.',
}
