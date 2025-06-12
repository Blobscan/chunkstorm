import client from 'prom-client';

const register = new client.Registry();

// Add a default label for all metrics
client.collectDefaultMetrics({
  register,
  prefix: 'chunkstorm_',
});

const httpRequestsTotal = new client.Counter({
  name: 'chunkstorm_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status']
});
register.registerMetric(httpRequestsTotal);

const httpRequestDuration = new client.Histogram({
  name: 'chunkstorm_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});
register.registerMetric(httpRequestDuration);

const chunksUploaded = new client.Counter({
  name: 'chunkstorm_chunks_uploaded_total',
  help: 'Total number of chunks uploaded to Bee nodes',
});
register.registerMetric(chunksUploaded);

const currentStampingBuckets = new client.Gauge({
  name: 'chunkstorm_stamping_buckets_count',
  help: 'Number of stamping buckets in use',
});
register.registerMetric(currentStampingBuckets);

const serverStartTime = new client.Gauge({
  name: 'chunkstorm_server_start_time_seconds',
  help: 'Server start time in seconds since Unix epoch',
});
register.registerMetric(serverStartTime);
serverStartTime.set(Math.floor(Date.now() / 1000));

export {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  chunksUploaded,
  currentStampingBuckets,
  serverStartTime
};
