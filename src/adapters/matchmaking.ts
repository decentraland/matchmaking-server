import { IBaseComponent } from '@well-known-components/interfaces'
import { AppComponents, WS_OPEN, WebSocket } from '../types'
import { randomUUID } from 'crypto'
import { encodeMatchMessage } from '../logic/protocol'

export type IMatchMakingComponent = IBaseComponent & {
  registerUser(ws: WebSocket, scene: string, address: string): void
  isUserInMatch(matchId: string, address: string): boolean
  getWorldName(matchId: string): string | undefined
}

type Match = {
  users: Set<string>
  world: string
  createdAt: number
}

// TODO
const MATCH_SIZE = 2

function deleteFromArray<T>(array: T[], value: T): T[] {
  const index = array.indexOf(value)
  if (index > -1) {
    array.splice(index, 1)
  }
  return array
}

export function createMatchMakingComponent({ logs }: Pick<AppComponents, 'logs'>): IMatchMakingComponent {
  const logger = logs.getLogger('match-making')

  const socketByAddress = new Map<string, WebSocket>()
  const lobbyByWorldName = new Map<string, string[]>()
  const matches = new Map<string, Match>() //TODO: delete the match after some time

  function registerUser(ws: WebSocket, world: string, address: string): void {
    socketByAddress.set(address, ws)
    {
      const users = lobbyByWorldName.get(world) || []
      users.push(address)
      if (users.length >= MATCH_SIZE) {
        const matchId = randomUUID()
        const match = {
          users: new Set<string>(),
          world,
          createdAt: Date.now()
        }
        const msg = encodeMatchMessage(matchId)
        for (let i = 0; i < MATCH_SIZE; ++i) {
          const address = users.shift()!
          const ws = socketByAddress.get(address)
          if (ws && ws.readyState === WS_OPEN) {
            ws.send(msg, true)
          }
          match.users.add(address)
        }
        logger.debug(`Match ${matchId} created for: ${JSON.stringify(Array.from(match.users))}`)
        matches.set(matchId, match)
      }
      lobbyByWorldName.set(world, users)
    }
    ws.on('close', () => {
      socketByAddress.delete(address)
      let users = lobbyByWorldName.get(world)
      if (users) {
        users = deleteFromArray(users, address)
        if (users.length > 0) {
          lobbyByWorldName.set(address, users)
        } else {
          lobbyByWorldName.delete(address)
        }
      }
    })
  }

  function isUserInMatch(matchId: string, address: string): boolean {
    const match = matches.get(matchId)
    if (!match) {
      return false
    }

    return match.users.has(address)
  }

  function getWorldName(matchId: string): string | undefined {
    const match = matches.get(matchId)
    if (!match) {
      return undefined
    }

    return match.world
  }

  return {
    registerUser,
    isUserInMatch,
    getWorldName
  }
}
