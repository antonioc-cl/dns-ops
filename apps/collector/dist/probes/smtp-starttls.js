/**
 * SMTP STARTTLS Probe - Bead 10
 *
 * Checks SMTP server for STARTTLS capability.
 * Performs limited SMTP handshake to detect TLS support.
 */
import * as net from 'net';
import * as tls from 'tls';
import { checkSSRF } from './ssrf-guard.js';
import { probeAllowlist } from './allowlist.js';
/**
 * Read SMTP response from socket
 */
function readResponse(socket, timeoutMs) {
    return new Promise((resolve, reject) => {
        let buffer = '';
        const timeout = setTimeout(() => {
            reject(new Error(`Timeout waiting for SMTP response`));
        }, timeoutMs);
        const onData = (data) => {
            buffer += data.toString();
            // Check for complete response (ends with \r\n)
            if (buffer.includes('\r\n')) {
                const lines = buffer.split('\r\n').filter(l => l);
                const lastLine = lines[lines.length - 1];
                // Parse response code
                const match = lastLine.match(/^(\d{3})/);
                if (match) {
                    clearTimeout(timeout);
                    socket.off('data', onData);
                    resolve({
                        code: parseInt(match[1], 10),
                        message: lastLine,
                    });
                }
            }
        };
        socket.on('data', onData);
        socket.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}
/**
 * Send SMTP command
 */
function sendCommand(socket, command) {
    socket.write(command + '\r\n');
}
/**
 * Probe SMTP server for STARTTLS capability
 */
export async function probeSMTPStarttls(hostname, options) {
    const { port = 25, timeoutMs = 30000, checkAllowlist = true, ehloDomain = 'dns-ops-probe.local', } = options || {};
    const startTime = Date.now();
    try {
        // SSRF check
        const ssrfCheck = checkSSRF(hostname);
        if (!ssrfCheck.allowed) {
            return {
                success: false,
                hostname,
                port,
                supportsStarttls: false,
                error: `SSRF blocked: ${ssrfCheck.reason}`,
                responseTimeMs: Date.now() - startTime,
            };
        }
        // Allowlist check
        if (checkAllowlist && !probeAllowlist.isAllowed(hostname, port)) {
            return {
                success: false,
                hostname,
                port,
                supportsStarttls: false,
                error: 'Destination not in allowlist. Generate allowlist from DNS results first.',
                responseTimeMs: Date.now() - startTime,
            };
        }
        // Create socket connection
        const socket = new net.Socket();
        // Set timeout
        socket.setTimeout(timeoutMs);
        // Connect
        await new Promise((resolve, reject) => {
            socket.once('connect', resolve);
            socket.once('error', reject);
            socket.connect(port, hostname);
        });
        // Read banner
        const banner = await readResponse(socket, 10000);
        const smtpBanner = banner.message;
        if (banner.code !== 220) {
            socket.destroy();
            return {
                success: false,
                hostname,
                port,
                supportsStarttls: false,
                smtpBanner,
                error: `Unexpected banner: ${banner.message}`,
                responseTimeMs: Date.now() - startTime,
            };
        }
        // Send EHLO
        sendCommand(socket, `EHLO ${ehloDomain}`);
        const ehloResponse = await readResponse(socket, 10000);
        if (ehloResponse.code !== 250) {
            socket.destroy();
            return {
                success: false,
                hostname,
                port,
                supportsStarttls: false,
                smtpBanner,
                error: `EHLO rejected: ${ehloResponse.message}`,
                responseTimeMs: Date.now() - startTime,
            };
        }
        // Check for STARTTLS in capabilities
        const supportsStarttls = ehloResponse.message.toUpperCase().includes('STARTTLS');
        if (!supportsStarttls) {
            socket.destroy();
            return {
                success: true,
                hostname,
                port,
                supportsStarttls: false,
                smtpBanner,
                responseTimeMs: Date.now() - startTime,
            };
        }
        // Try STARTTLS
        sendCommand(socket, 'STARTTLS');
        const starttlsResponse = await readResponse(socket, 10000);
        if (starttlsResponse.code !== 220) {
            socket.destroy();
            return {
                success: true,
                hostname,
                port,
                supportsStarttls: true,
                smtpBanner,
                error: `STARTTLS rejected: ${starttlsResponse.message}`,
                responseTimeMs: Date.now() - startTime,
            };
        }
        // Upgrade to TLS
        const tlsSocket = tls.connect({
            socket,
            servername: hostname,
            rejectUnauthorized: false, // Allow self-signed for probing
        });
        await new Promise((resolve, reject) => {
            tlsSocket.once('secureConnect', resolve);
            tlsSocket.once('error', reject);
        });
        // Get TLS info
        const tlsInfo = tlsSocket.getCipher();
        const cert = tlsSocket.getPeerCertificate();
        // Close connection gracefully
        tlsSocket.write('QUIT\r\n');
        tlsSocket.end();
        return {
            success: true,
            hostname,
            port,
            supportsStarttls: true,
            tlsVersion: tlsInfo.version,
            tlsCipher: tlsInfo.name,
            certificate: cert.subject ? {
                subject: String(cert.subject.CN || cert.subject.O || 'Unknown'),
                issuer: String(cert.issuer.CN || cert.issuer.O || 'Unknown'),
                validFrom: cert.valid_from,
                validTo: cert.valid_to,
                fingerprint: cert.fingerprint,
            } : undefined,
            smtpBanner,
            responseTimeMs: Date.now() - startTime,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isTimeout = errorMessage.toLowerCase().includes('timeout') ||
            errorMessage.toLowerCase().includes('etimedout') ||
            errorMessage.includes('ETIMEDOUT');
        return {
            success: false,
            hostname,
            port,
            supportsStarttls: false,
            error: isTimeout
                ? `Timeout after ${timeoutMs}ms`
                : errorMessage,
            responseTimeMs: Date.now() - startTime,
        };
    }
}
/**
 * Batch probe multiple MX hosts
 */
export async function probeMXHosts(hosts, options) {
    const { timeoutMs = 30000, concurrency = 3 } = options || {};
    const results = [];
    // Process in batches to limit concurrency
    for (let i = 0; i < hosts.length; i += concurrency) {
        const batch = hosts.slice(i, i + concurrency);
        const batchPromises = batch.map(host => probeSMTPStarttls(host.hostname, { timeoutMs }));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }
    return results;
}
//# sourceMappingURL=smtp-starttls.js.map