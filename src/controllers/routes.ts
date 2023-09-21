import { Router } from '@well-known-components/http-server'
import { GlobalContext } from '../types'
import { pingHandler } from './handlers/ping-handler'
import { wsHandler } from './handlers/ws-handler'
import { statusHandler } from './handlers/status-handler'
import { errorHandler } from './handlers/error-handler'
import { aboutHandler } from './handlers/about-handler'
import { commsAdapterHandler, commsAdapterOptionsHandler } from './handlers/comms-handler'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(_globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()
  router.use(errorHandler)

  router.get('/ping', pingHandler)
  router.get('/ws/:world', wsHandler)
  router.get('/match/:matchId/about', aboutHandler)
  router.options('/get-comms-adapter/:matchId', commsAdapterOptionsHandler)
  router.post('/get-comms-adapter/:matchId', commsAdapterHandler)
  router.get('/status', statusHandler)

  return router
}
