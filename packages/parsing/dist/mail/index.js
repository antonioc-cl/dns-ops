/**
 * Mail Record Parsing
 *
 * Parse SPF, DMARC, and DKIM records.
 */
/**
 * Parse an SPF TXT record
 */
export function parseSPF(txtData) {
    // Check if this is an SPF record
    if (!txtData.includes('v=spf1')) {
        return null;
    }
    const parts = txtData.split(/\s+/).filter(Boolean);
    const mechanisms = [];
    const modifiers = [];
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        // Version
        if (part.startsWith('v=')) {
            continue;
        }
        // Modifier (key=value format)
        if (part.includes('=')) {
            const [name, ...valueParts] = part.split('=');
            modifiers.push({
                name,
                value: valueParts.join('='),
            });
            continue;
        }
        // Mechanism
        const mechanism = parseMechanism(part);
        if (mechanism) {
            mechanisms.push(mechanism);
        }
    }
    return {
        version: 'spf1',
        mechanisms,
        modifiers,
        raw: txtData,
    };
}
function parseMechanism(part) {
    // Determine prefix
    let prefix = '+';
    let prefixName = 'pass';
    if (part.startsWith('-')) {
        prefix = '-';
        prefixName = 'fail';
        part = part.slice(1);
    }
    else if (part.startsWith('~')) {
        prefix = '~';
        prefixName = 'softfail';
        part = part.slice(1);
    }
    else if (part.startsWith('?')) {
        prefix = '?';
        prefixName = 'neutral';
        part = part.slice(1);
    }
    else if (part.startsWith('+')) {
        part = part.slice(1);
    }
    // Parse mechanism type and value
    const colonIndex = part.indexOf(':');
    const type = colonIndex >= 0 ? part.slice(0, colonIndex) : part;
    const value = colonIndex >= 0 ? part.slice(colonIndex + 1) : undefined;
    return {
        type,
        value,
        prefix,
        prefixName,
    };
}
/**
 * Count DNS lookups in an SPF record
 */
export function countSPFLookups(record) {
    let count = 0;
    const lookupMechanisms = ['include', 'a', 'mx', 'ptr', 'exists', 'redirect'];
    for (const mech of record.mechanisms) {
        if (lookupMechanisms.includes(mech.type)) {
            count++;
        }
    }
    return count;
}
/**
 * Parse a DMARC TXT record
 */
export function parseDMARC(txtData) {
    // Check if this is a DMARC record
    if (!txtData.includes('v=DMARC1')) {
        return null;
    }
    const record = {
        version: 'DMARC1',
        raw: txtData,
    };
    const parts = txtData.split(/\s*;\s*/).filter(Boolean);
    for (const part of parts) {
        const [key, ...valueParts] = part.split('=');
        const value = valueParts.join('=').trim();
        switch (key.trim()) {
            case 'v':
                record.version = value;
                break;
            case 'p':
                record.policy = value;
                break;
            case 'sp':
                record.subdomainPolicy = value;
                break;
            case 'pct':
                record.percentage = parseInt(value, 10);
                break;
            case 'rua':
                record.rua = value.split(',').map((s) => s.trim());
                break;
            case 'ruf':
                record.ruf = value.split(',').map((s) => s.trim());
                break;
            case 'fo':
                record.fo = value;
                break;
            case 'adkim':
                record.adkim = value;
                break;
            case 'aspf':
                record.aspf = value;
                break;
            case 'rf':
                record.rf = value;
                break;
            case 'ri':
                record.ri = parseInt(value, 10);
                break;
        }
    }
    // Policy is required
    if (!record.policy) {
        return null;
    }
    return record;
}
/**
 * Parse a DKIM TXT record
 */
export function parseDKIM(txtData) {
    const record = {
        keyType: 'rsa',
        raw: txtData,
    };
    // DKIM records use key=value format
    const parts = txtData.split(/\s*;\s*/).filter(Boolean);
    for (const part of parts) {
        const [key, ...valueParts] = part.split('=');
        const value = valueParts.join('=').trim();
        switch (key.trim()) {
            case 'v':
                record.version = value;
                break;
            case 'k':
                record.keyType = value;
                break;
            case 'p':
                record.publicKey = value;
                break;
            case 's':
                record.serviceType = value.split(':').map((s) => s.trim());
                break;
            case 'n':
                record.notes = value;
                break;
            case 't':
                record.flags = value.split(':').map((s) => s.trim());
                break;
        }
    }
    // Public key is required
    if (!record.publicKey) {
        return null;
    }
    return record;
}
/**
 * Parse an MTA-STS TXT record
 */
export function parseMTASTS(txtData) {
    if (!txtData.includes('v=STSv1')) {
        return null;
    }
    const record = {
        version: 'STSv1',
        raw: txtData,
    };
    const parts = txtData.split(/\s*;\s*/).filter(Boolean);
    for (const part of parts) {
        const [key, ...valueParts] = part.split('=');
        const value = valueParts.join('=').trim();
        switch (key.trim()) {
            case 'v':
                record.version = value;
                break;
            case 'id':
                // ID is a timestamp/version identifier
                break;
        }
    }
    // MTA-STS policy details come from the HTTPS endpoint
    // The TXT record just signals that MTA-STS is configured
    return record;
}
//# sourceMappingURL=index.js.map