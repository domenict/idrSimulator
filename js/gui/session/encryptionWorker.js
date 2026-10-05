// Runs worker to keep main thread clear during encryption/decryption
async function runWorkerTask(task, data) {
    cryptoWorker = createCryptoWorker();

    return new Promise((resolve, reject) => {
        cryptoWorker.onmessage = (e) => {
            resolve(e.data);
            cryptoWorker.terminate();
            cryptoWorker = null;
        };
        cryptoWorker.onerror = (err) => {
            console.log("Worker execution failed");
            reject(new Error(err.message || "Worker execution failed"));
            cryptoWorker.terminate();
            cryptoWorker = null;
        };
        cryptoWorker.postMessage({ task, data });
    });
}

// Creates worker blob to offload heavy encryption compute for improved UI -- code by Grok
function createCryptoWorker() {
    const pureArgonCodeText = `(${argon2WrapperFunction.toString()})();`;
    const workerScript = `
        ${pureArgonCodeText}

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        async function getKeyFromPassphrase(passphrase, salt) {
            try {
                const params = {
                    pass: passphrase,
                    salt: salt,
                    time: 3,
                    mem: 64 * 1024,
                    parallelism: 1,
                    hashLen: 32,
                    type: argon2.ArgonType.Argon2id
                };
                const { hash } = await argon2.hash(params);
                return await crypto.subtle.importKey(
                    'raw',
                    hash,
                    { name: 'AES-GCM' },
                    false,
                    ['encrypt', 'decrypt']
                );
            } catch (e) {
                throw new Error('Key derivation failed: ' + e.message);
            }
        }

        async function encryptData(passphrase, plainObj) {
            if (typeof passphrase !== 'string' || passphrase.length === 0) {
                throw new Error('Passphrase must be a non-empty string');
            }
            if (plainObj === null || plainObj === undefined) {
                throw new Error('Data to encrypt cannot be null/undefined');
            }

            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv   = crypto.getRandomValues(new Uint8Array(12));
            const key  = await getKeyFromPassphrase(passphrase, salt);

            const jsonString = JSON.stringify(plainObj);
            const data = encoder.encode(jsonString);

            const ciphertext = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );

            return btoa(JSON.stringify({
                s: Array.from(salt),
                i: Array.from(iv),
                c: Array.from(new Uint8Array(ciphertext))
            }));
        }

        async function decryptData(passphrase, encryptedB64) {
            if (typeof passphrase !== 'string' || passphrase.length === 0) {
                throw new Error('Passphrase must be a non-empty string');
            }
            if (typeof encryptedB64 !== 'string' || encryptedB64.length === 0) {
                throw new Error('Encrypted data must be a non-empty Base64 string');
            }

            let envelope;
            try {
                envelope = JSON.parse(atob(encryptedB64));
            } catch (_) {
                throw new Error('Invalid Base64 or corrupted envelope');
            }

            const { s, i, c } = envelope;
            if (!Array.isArray(s) || !Array.isArray(i) || !Array.isArray(c)) {
                throw new Error('Envelope missing required arrays (s, i, c)');
            }
            if (s.length < 16) throw new Error('Salt too short (expected ≥16 bytes)');
            if (i.length !== 12) throw new Error('IV must be exactly 12 bytes');
            if (c.length === 0) throw new Error('Ciphertext is empty');

            const salt = new Uint8Array(s);
            const iv   = new Uint8Array(i);
            const ciphertext = new Uint8Array(c);

            const key = await getKeyFromPassphrase(passphrase, salt);
            let plain;
            try {
                plain = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv },
                    key,
                    ciphertext
                );
            } catch (e) {
                throw new Error('Decryption failed: wrong passphrase or corrupted data');
            }

            const jsonString = decoder.decode(plain);
            try {
                return JSON.parse(jsonString);
            } catch (_) {
                throw new Error('Decrypted data is not valid JSON');
            }
        }

        self.onmessage = async function(e) {
            const { task, data } = e.data;
            const passphrase = data[0];
            const payload    = data[1];
            let result;

            try {
                if (task === 'encrypt') {
                    result = await encryptData(passphrase, payload);
                } else if (task === 'decrypt') {
                    result = await decryptData(passphrase, payload);
                } else {
                    throw new Error('Unknown task: ' + task);
                }
            } catch (err) {
                result = { error: err.message };
            }

            self.postMessage(result);
        };

        self.onerror = function(err) {
            self.postMessage({ error: 'Worker crashed: ' + err.message });
        };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(blob);
    cryptoWorker = new Worker(workerUrl);

    // revoke immediately for clean-up
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;

    return cryptoWorker;
}