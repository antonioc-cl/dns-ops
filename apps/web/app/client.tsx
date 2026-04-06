import { StartClient } from '@tanstack/react-start/client';
import { hydrateRoot } from 'react-dom/client';
import { createRouter } from './router.js';
import './styles/app.css';

const router = createRouter();

function bootstrap() {
  hydrateRoot(document, <StartClient router={router} />);
}

bootstrap();

export default bootstrap;
