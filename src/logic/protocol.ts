export enum MessageType {
  Auth = 1,
  Match = 2
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function decodeMessage(data: Uint8Array): [MessageType, Uint8Array] {
  const msgType = data.at(0) as number
  return [msgType, data.subarray(1)]
}

export function encodeMatchMessage(realmUrl: string): Uint8Array {
  const encodedMessage = encoder.encode(realmUrl)
  const packet = new Uint8Array(encodedMessage.byteLength + 1)
  packet.set([MessageType.Match])
  packet.set(encodedMessage, 1)
  return packet
}

export function decodeJSON(data: Uint8Array) {
  return JSON.parse(decoder.decode(data))
}
