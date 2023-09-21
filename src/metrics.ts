import { IMetricsComponent } from '@well-known-components/interfaces'
import { getDefaultHttpMetrics, validateMetricsDeclaration } from '@well-known-components/metrics'
import { metricDeclarations as logsMetricsDeclarations } from '@well-known-components/logger'

export const metricDeclarations = {
  ...getDefaultHttpMetrics(),
  ...logsMetricsDeclarations,
  matchmaking_server_connection_count: {
    help: 'Number of connected peers',
    type: IMetricsComponent.GaugeType
  },
  matchmaking_server_state_size: {
    help: 'Scene state size in bytes',
    type: IMetricsComponent.GaugeType,
    labelNames: ['hash']
  },
  matchmaking_server_sent_bytes: {
    help: 'Sent size in bytes',
    type: IMetricsComponent.HistogramType,
    labelNames: ['hash']
  },
  matchmaking_server_recv_bytes: {
    help: 'Receive size in bytes',
    type: IMetricsComponent.HistogramType,
    labelNames: ['hash']
  }
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
