import { StartClient } from '@tanstack/react-start/client';
import { hydrateRoot } from 'react-dom/client';
import { createRouter } from './router.js';

const router = createRouter();

function bootstrap() {
  hydrateRoot(document, <StartClient router={router} />);
}

bootstrap();

export default bootstrap;
