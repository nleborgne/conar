import type { Database } from '~/lib/indexeddb'
import { Alert, AlertDescription, AlertTitle } from '@conar/ui/components/alert'
import { Button } from '@conar/ui/components/button'
import { LoadingContent } from '@conar/ui/components/custom/loading-content'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@conar/ui/components/dialog'
import { Input } from '@conar/ui/components/input'
import { Label } from '@conar/ui/components/label'
import { RiAlertLine } from '@remixicon/react'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useImperativeHandle, useState } from 'react'
import { toast } from 'sonner'
import { databaseContextQuery, dropTableSql } from '~/entities/database'
import { dbQuery } from '~/lib/query'
import { queryClient } from '~/main'
import { tabsStore } from './tabs'

interface DropTableDialogProps {
  ref: React.RefObject<{
    drop: (schema: string, table: string) => void
  } | null>
  database: Database
}

export function DropTableDialog({ ref, database }: DropTableDialogProps) {
  const router = useRouter()
  const [confirmationText, setConfirmationText] = useState('')
  const [schema, setSchema] = useState('')
  const [table, setTable] = useState('')
  const [open, setOpen] = useState(false)

  useImperativeHandle(ref, () => ({
    drop: (schema: string, table: string) => {
      setSchema(schema)
      setTable(table)
      setOpen(true)
    },
  }))

  const { mutate: dropTable, isPending } = useMutation({
    mutationFn: async () => {
      await dbQuery({
        type: database.type,
        connectionString: database.connectionString,
        query: dropTableSql(schema, table)[database.type],
      })
    },
    onSuccess: () => {
      toast.success(`Table "${table}" successfully dropped`)
      setOpen(false)
      setConfirmationText('')

      queryClient.invalidateQueries(databaseContextQuery(database))
      tabsStore.setState(prev => ({
        ...prev,
        [database.id]: prev[database.id]?.filter(tab => tab.table !== table),
      }))

      if (router.state.location.pathname.startsWith(`/database/${database.id}/tables`)) {
        router.navigate({
          to: '/database/$id/tables',
          params: { id: database.id },
        })
      }
    },
  })

  const canConfirm = confirmationText === `DROP TABLE ${table}`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Drop Table
          </DialogTitle>
          <div className="space-y-4">
            <Alert variant="destructive">
              <RiAlertLine className="size-5 text-destructive" />
              <AlertTitle>This action cannot be undone.</AlertTitle>
              <AlertDescription>
                This will permanently delete the table and all its data from the database.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="confirmation" className="font-normal">
                <span>
                  Type
                  {' '}
                  <span className="font-semibold">
                    DROP TABLE
                    {' '}
                    {table}
                  </span>
                  {' '}
                  to confirm
                </span>
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={e => setConfirmationText(e.target.value)}
                placeholder={`DROP TABLE ${table}`}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-4 flex gap-2">
          <DialogClose asChild>
            <Button
              variant="outline"
              onClick={() => setConfirmationText('')}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => dropTable()}
            disabled={!canConfirm || isPending}
          >
            <LoadingContent loading={isPending}>
              Drop Table
            </LoadingContent>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
