import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { HandlerContextWithPath, WebSocket } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { verify } from '@dcl/platform-crypto-middleware'
import { MessageType, decodeJSON, decodeMessage } from '../../logic/protocol'

const authTimeout = 1000 * 5 // 5 secs

export async function wsHandler(
  context: HandlerContextWithPath<'logs' | 'config' | 'fetch' | 'matchmaking' | 'wsRegistry', '/ws/:world'>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { logs, config, fetch, matchmaking, wsRegistry }
  } = context
  const logger = logs.getLogger('Websocket Handler')

  logger.debug('Websocket requested')

  const baseUrl = (
    (await config.getString('HTTP_BASE_URL')) || `${context.url.protocol}//${context.url.host}`
  ).toString()
  const path = new URL(baseUrl + context.url.pathname)

  return upgradeWebSocketResponse((socket) => {
    const ws = socket as any as WebSocket
    wsRegistry.onWsConnected(ws)
    ws.on('error', (error) => {
      logger.error('ws-error')
      logger.error(error)
      try {
        ws.end()
      } catch {}
    })

    ws.on('close', () => {
      logger.debug('Websocket closed')
    })

    let authenticated = false

    async function waitForAuth(data: ArrayBuffer) {
      const [msgType, msgData] = decodeMessage(new Uint8Array(data))
      if (msgType === MessageType.Auth) {
        try {
          const headers = decodeJSON(msgData)
          const verification = await verify(context.request.method, path.pathname, headers, {
            fetcher: fetch
          })
          const address = verification.auth
          authenticated = true
          matchmaking.registerUser(ws, context.params.world, address)
          logger.log('ws authenticated')
        } catch (e: any) {
          logger.debug(e)
          ws.end()
        } finally {
          ws.off('message', waitForAuth)
        }
      }
    }

    setTimeout(() => {
      if (!authenticated && ws.readyState === 1) {
        logger.debug('Timeout waiting for authentication message')
        ws.end()
      }
    }, authTimeout)
    ws.on('message', waitForAuth)
  })
}
