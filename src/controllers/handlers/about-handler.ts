import { HandlerContextWithPath, NotFoundError } from '../../types'
import { IHttpServerComponent } from '@well-known-components/interfaces'

export async function aboutHandler(
  context: HandlerContextWithPath<'logs' | 'fetch' | 'config' | 'matchmaking', '/match/:matchId/about'>
): Promise<IHttpServerComponent.IResponse> {
  const {
    components: { config, fetch, matchmaking },
    url
  } = context

  const matchId = context.params.matchId

  const worldName = matchmaking.getWorldName(matchId)
  if (!worldName) {
    throw new NotFoundError('Match not found')
  }

  const worldServerUrl = await config.requireString('WORLD_CONTENT_SERVER_URL')
  const aboutUrl = `${worldServerUrl}/world/${worldName}/about`

  let about
  try {
    const aboutResponse = await fetch.fetch(aboutUrl)
    about = await aboutResponse.json()
  } catch (err) {
    throw new NotFoundError(`World ${worldName} does not exist in ${worldServerUrl}`)
  }

  const baseUrl = (await config.getString('HTTP_BASE_URL')) || `${url.protocol}//${url.host}`

  about.comms.fixedAdapter = `signed-login:${baseUrl}/get-comms-adapter/${matchId}`

  return {
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    status: 200,
    body: about
  }
}
