#!/usr/bin/env node
/**
 * Converts snarkjs verification key to Solana groth16-solana format
 *
 * The groth16-solana library uses compressed points:
 * - G1 points: 32 bytes (x-coordinate with sign bit)
 * - G2 points: 64 bytes (x-coordinates of both elements with sign bits)
 */

const fs = require('fs');
const path = require('path');

// BN254 field modulus
const FIELD_MODULUS = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");

function bigIntToBytes(n, length = 32) {
    const hex = n.toString(16).padStart(length * 2, '0');
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function formatBytesAsRust(bytes, indent = '    ') {
    const lines = [];
    for (let i = 0; i < bytes.length; i += 16) {
        const chunk = bytes.slice(i, Math.min(i + 16, bytes.length));
        lines.push(indent + chunk.map(b => b.toString()).join(', ') + ',');
    }
    return lines.join('\n');
}

// Compress G1 point (x, y) to 32 bytes
// High bit of first byte indicates sign of y
function compressG1(point) {
    const x = BigInt(point[0]);
    const y = BigInt(point[1]);

    // Get bytes of x (big-endian)
    const xBytes = bigIntToBytes(x, 32);

    // Determine if y is "greater than" p/2 (for sign)
    const yIsOdd = y > FIELD_MODULUS / BigInt(2);

    // Set high bit if y is "negative" (greater than p/2)
    if (yIsOdd) {
        xBytes[0] |= 0x80;
    }

    return xBytes;
}

// Compress G2 point [[x1, x2], [y1, y2]] to 64 bytes
function compressG2(point) {
    const x1 = BigInt(point[0][0]);
    const x2 = BigInt(point[0][1]);
    const y1 = BigInt(point[1][0]);
    const y2 = BigInt(point[1][1]);

    // Get bytes of x coordinates (big-endian)
    // Note: G2 elements are in Fq2, represented as c0 + c1*u
    // The x-coordinate is [x1, x2] where x = x1 + x2*u
    const x1Bytes = bigIntToBytes(x1, 32);
    const x2Bytes = bigIntToBytes(x2, 32);

    // Determine sign based on y2 (the imaginary part)
    // If y2 == 0, use y1
    const yForSign = y2 !== BigInt(0) ? y2 : y1;
    const yIsOdd = yForSign > FIELD_MODULUS / BigInt(2);

    // Set high bit of first byte if y is "negative"
    if (yIsOdd) {
        x2Bytes[0] |= 0x80;
    }

    // Return concatenated bytes [x2 | x1] (reverse order for Solana)
    return [...x2Bytes, ...x1Bytes];
}

function convertVkeyToSolana(inputPath, outputPath, name) {
    const vkey = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Compress all G1 points in IC
    const icCompressed = vkey.IC.map(point => compressG1(point));

    // Compress G1 and G2 points from verification key
    const vkAlpha1 = compressG1(vkey.vk_alpha_1);
    const vkBeta2 = compressG2(vkey.vk_beta_2);
    const vkGamma2 = compressG2(vkey.vk_gamma_2);
    const vkDelta2 = compressG2(vkey.vk_delta_2);

    const nPublic = vkey.nPublic;

    // Generate Rust code
    let rustCode = `// Auto-generated verification key for ${name}
// Generated from: ${path.basename(inputPath)}
// Public inputs: ${nPublic}

use groth16_solana::groth16::Groth16Verifyingkey;

pub const VERIFYINGKEY_${name.toUpperCase()}: Groth16Verifyingkey = Groth16Verifyingkey {
    nr_pubinputs: ${nPublic},

    vk_alpha_g1: [
${formatBytesAsRust(vkAlpha1, '        ')}
    ],

    vk_beta_g2: [
${formatBytesAsRust(vkBeta2, '        ')}
    ],

    vk_gamme_g2: [
${formatBytesAsRust(vkGamma2, '        ')}
    ],

    vk_delta_g2: [
${formatBytesAsRust(vkDelta2, '        ')}
    ],

    vk_ic: &[
`;

    for (let i = 0; i < icCompressed.length; i++) {
        rustCode += `        [\n${formatBytesAsRust(icCompressed[i], '            ')}\n        ],\n`;
    }

    rustCode += `    ],
};
`;

    fs.writeFileSync(outputPath, rustCode);
    console.log(`Generated ${outputPath}`);
    console.log(`  - ${nPublic} public inputs`);
    console.log(`  - ${icCompressed.length} IC elements`);
}

// Convert both verification keys
const circuitsDir = path.dirname(process.argv[1]);
const buildDir = path.join(circuitsDir, 'build');
const srcDir = path.join(circuitsDir, '..', 'programs', 'privacy-vault', 'src');

// Ensure output directory exists
if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
}

try {
    convertVkeyToSolana(
        path.join(buildDir, 'withdraw_vkey.json'),
        path.join(buildDir, 'withdraw_verifying_key.rs'),
        'withdraw'
    );

    convertVkeyToSolana(
        path.join(buildDir, 'innocence_vkey.json'),
        path.join(buildDir, 'innocence_verifying_key.rs'),
        'innocence'
    );

    console.log('\nVerification keys converted successfully!');
    console.log('Copy the .rs files to your Solana program src directory.');
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
