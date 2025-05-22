# Reverse Proxy Server

A high-performance, feature-rich reverse proxy server built with Node.js and TypeScript, designed for load balancing, request routing, and traffic management.

## Features

- **Load Balancing**: Multiple algorithms (round-robin, least-connections, IP hash, random)
- **Health Checking**: Automatic upstream health monitoring with failover
- **Request Routing**: Flexible path-based routing with regex and parameter support
- **Caching**: Built-in response caching with configurable TTL
- **Authentication**: Support for Basic Auth, JWT, and API Key authentication
- **Rate Limiting**: Configurable rate limiting per client
- **Request/Response Transformation**: Header manipulation and body transformation
- **Redirection**: Support for HTTP redirects and informational responses
- **Worker Pool**: Multi-process architecture for high concurrency
- **YAML Configuration**: Easy-to-use configuration system with validation

## Project Structure

```
proxy-server/
├── dist/                          # Compiled JavaScript output
├── node_modules/                  # Dependencies
├── src/                           # Source code
│   ├── config-schema.ts           # Zod schemas for configuration validation
│   ├── config.ts                  # Configuration parsing and validation
│   ├── server-schema.ts           # Worker message schemas
│   ├── server.ts                  # Main server implementation
│   ├── load-balancing.ts          # Load balancing algorithms
│   ├── index.ts                   # CLI support
│   └── load-balancer-test.ts      # Load balancer tests
├── .gitignore                     # Git ignore file
├── config.yaml                    # Main configuration file
├── package.json                   # Package dependencies and scripts
├── package-lock.json              # Locked dependency versions
├── pnpage.json                    # Additional package configuration
└── README.md                      # This file
```

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Rishabh426/proxy-server
   cd proxy-server
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Build the project**:
   ```bash
   pnpm run dev
   ```

## Configuration

The proxy server uses a YAML configuration file (`config.yaml`) to define its behavior. Here's a complete example:

```yaml
server:
  listen: 3000
  upstreams:
    - id: "node1"
      url: "jsonplaceholder.typicode.com"
    - id: "node2"
      url: "localhost:8081"
  headers:  
    - key: "X-Forwarded-For"
      value: "$ip"
    - key: Authorization
      value: 'Bearer xyz'
  rules:
    - path: /users
      upstreams: ["node1"]
    - path: /comments
      upstreams: ["node1"]
    - path: /todos
      upstreams: ["node1"]
```

### Configuration Options

#### Server Settings
- **`listen`**: Port number to listen on
- **`workers`**: Number of worker processes (defaults to CPU count)
- **`loadBalancing`**: Load balancing algorithm

#### Upstreams
- **`id`**: Unique identifier for the upstream
- **`url`**: Backend server URL

#### Rules
- **`path`**: Route pattern (supports wildcards and parameters)
- **`upstreams`**: List of upstream IDs to route to
- **`headers`**: Custom headers to add

#### Variable Substitution
Headers support variable substitution:
- **`$ip`**: Client IP address
- **`$host`**: Request host header
- **`$useragent`**: User-Agent header
- **`$method`**: HTTP method
- **`$path`**: Request path

## Usage

### Starting the Server

```bash
npm start -- --config config.yaml

node dist/index.js --config config.yaml
```

### Development Mode

```bash
pnpm run dev -- --config config.yaml
```

### Testing Load Balancer

```bash
pnpm dlx ts-node src/load-balancer-test.ts
```

## API Endpoints

The proxy server automatically handles all HTTP methods and routes them according to your configuration. Some special behaviors:

### HTTP Redirect (`301` or `302`)
Performs an actual HTTP redirect to the upstream server. The client's browser will show the upstream URL.


### API Key Authentication
```yaml
auth:
  api-auth:
    type: "apikey"
    options:
      apiKeys: ["key1", "key2"]
      headerName: "X-API-Key"
```

### Log Output Example
```
Master process is running
Master process: Worker node 0 started
Master process: Worker node 1 started
Reverse proxy running on port 3000
Upstream api-server status changed from unknown to healthy
```

## Performance Tuning

### Worker Count
Set the number of workers based on your CPU cores and expected load:
```yaml
server:
  workers: 4  # Typically CPU cores or CPU cores * 2
```

### Caching
Enable caching for frequently accessed, relatively static content:
```yaml
rules:
  - path: "/api/static/*"
    cacheEnabled: true
    cacheTtl: 3600  # 1 hour
```

### Load Balancing
Choose the appropriate algorithm for your use case:
- **`round-robin`**: Even distribution
- **`least-connections`**: Route to least busy server
- **`ip-hash`**: Consistent routing per client
- **`random`**: Simple random selection

## Error Handling

The proxy server handles various error scenarios:

- **Upstream Unavailable**: Returns 502 Bad Gateway
- **Route Not Found**: Returns 404 Not Found
- **Internal Errors**: Returns 500 Internal Server Error

## Development

### Adding New Features

1. **Create feature module** in `src/`
2. **Add configuration schema** in `config-schema.ts`
3. **Update server implementation** in `server.ts`
4. **Add tests** in appropriate test file
5. **Update documentation**

## Dependencies

### Runtime Dependencies
- **`commander`**: CLI argument parsing
- **`yaml`**: YAML configuration parsing
- **`zod`**: Runtime type validation
- **`path-to-regexp`**: Advanced routing patterns

### Development Dependencies
- **`typescript`**: TypeScript compiler
- **`@types/node`**: Node.js type definitions
- **`nodemon`**: Development auto-restart

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Update documentation
6. Submit a pull request


## Support

For issues and questions:
1. Check the documentation above
2. Review configuration examples
3. Check server logs for error details
4. Open an issue on GitHub with:
   - Configuration file
   - Error logs
   - Steps to reproduce

## Roadmap

- [ ] WebSocket proxying support
- [ ] SSL/TLS termination
- [ ] Metrics and monitoring dashboard
- [ ] Plugin system for custom middleware
- [ ] Docker containerization
- [ ] Kubernetes integration
- [ ] gRPC proxying support