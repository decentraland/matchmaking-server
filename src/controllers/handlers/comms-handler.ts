import { HandlerContextWithPath, NotAuthorizedError, NotFoundError } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { verify } from '@dcl/platform-crypto-middleware'
import { AccessToken, TrackSource } from 'livekit-server-sdk'

export async function commsAdapterOptionsHandler(
  context: HandlerContextWithPath<'matchmaking' | 'logs' | 'config' | 'fetch', '/get-comms-adapter/:matchId'>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { logs }
  } = context

  const logger = logs.getLogger('comms-adapter-options')
  logger.log('request comms')

  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*'
    },
    status: 200,
    body: {}
  }
}

export async function commsAdapterHandler(
  context: HandlerContextWithPath<'matchmaking' | 'logs' | 'config' | 'fetch', '/get-comms-adapter/:matchId'>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { config, matchmaking, fetch, logs }
  } = context

  const logger = logs.getLogger('comms-adapter')
  logger.log('request comms')

  const [roomPrefix, livekitApiKey, livekitApiSecret, livekitHost] = await Promise.all([
    config.getString('ROOM_PREFIX'),
    config.requireString('LIVEKIT_API_KEY'),
    config.requireString('LIVEKIT_API_SECRET'),
    config.requireString('LIVEKIT_HOST')
  ])

  const { matchId } = context.params

  const baseUrl = (await config.getString('HTTP_BASE_URL')) || `${context.url.protocol}//${context.url.host}`

  const path = new URL(baseUrl + context.url.pathname)

  let address
  try {
    const verification = await verify(context.request.method, path.pathname, context.request.headers.raw(), {
      fetcher: fetch
    })
    address = verification.auth
  } catch (e) {
    logger.log('auth failed')
    throw new NotAuthorizedError('Access denied, invalid signed-fetch request')
  }

  if (!matchmaking.isUserInMatch(matchId, address)) {
    throw new NotFoundError('Match does not exist')
  }

  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: address,
    ttl: 5 * 60 // 5 minutes
  })
  token.addGrant({
    roomJoin: true,
    room: (roomPrefix || '') + matchId,
    roomList: false,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canPublishSources: [TrackSource.MICROPHONE]
  })

  const fixedAdapter = `livekit:wss://${livekitHost}?access_token=${token.toJwt()}`

  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*'
    },
    status: 200,
    body: {
      fixedAdapter
    }
  }
}
