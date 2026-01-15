#!/usr/bin/env node
/**
 * Converts snarkjs verification key to Solana groth16-solana format
 *
 * groth16-solana expects UNCOMPRESSED points:
 * - G1 points: 64 bytes (x + y coordinates, 32 bytes each, big-endian)
 * - G2 points: 128 bytes (x1 + x2 + y1 + y2, 32 bytes each, big-endian)
 */

const fs = require('fs');
const path = require('path');

function bigIntToBytes32BE(n) {
    const bn = BigInt(n);
    const hex = bn.toString(16).padStart(64, '0');
    const bytes = [];
    for (let i = 0; i < 64; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function formatBytesAsRust(bytes, indent = '        ') {
    const lines = [];
    for (let i = 0; i < bytes.length; i += 14) {
        const chunk = bytes.slice(i, Math.min(i + 14, bytes.length));
        lines.push(indent + chunk.map(b => b + 'u8').join(', ') + ',');
    }
    return lines.join('\n');
}

// Convert G1 point [x, y, z] to 64 bytes (uncompressed, affine)
function g1ToBytes(point) {
    const x = bigIntToBytes32BE(point[0]);
    const y = bigIntToBytes32BE(point[1]);
    return [...x, ...y];
}

// Convert G2 point [[x1, x2], [y1, y2], [z1, z2]] to 128 bytes
// groth16-solana expects: [x2, x1, y2, y1] (reversed order for extension field)
function g2ToBytes(point) {
    const x1 = bigIntToBytes32BE(point[0][0]);
    const x2 = bigIntToBytes32BE(point[0][1]);
    const y1 = bigIntToBytes32BE(point[1][0]);
    const y2 = bigIntToBytes32BE(point[1][1]);
    // Order: x2, x1, y2, y1 (Solana convention)
    return [...x2, ...x1, ...y2, ...y1];
}

function convertVkeyToSolana(inputPath, outputPath, constName) {
    const vkey = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    const vkAlpha1 = g1ToBytes(vkey.vk_alpha_1);
    const vkBeta2 = g2ToBytes(vkey.vk_beta_2);
    const vkGamma2 = g2ToBytes(vkey.vk_gamma_2);
    const vkDelta2 = g2ToBytes(vkey.vk_delta_2);
    const icPoints = vkey.IC.map(point => g1ToBytes(point));

    const nPublic = vkey.nPublic;

    let rustCode = `use groth16_solana::groth16::Groth16Verifyingkey;

// ${constName} circuit verifying key
// Public inputs: ${nPublic}
pub const ${constName}: Groth16Verifyingkey = Groth16Verifyingkey {
    nr_pubinputs: ${nPublic},

    vk_alpha_g1: [
${formatBytesAsRust(vkAlpha1)}
    ],

    vk_beta_g2: [
${formatBytesAsRust(vkBeta2)}
    ],

    vk_gamma_g2: [
${formatBytesAsRust(vkGamma2)}
    ],

    vk_delta_g2: [
${formatBytesAsRust(vkDelta2)}
    ],

    vk_ic: &[
`;

    for (const ic of icPoints) {
        rustCode += `        [\n${formatBytesAsRust(ic, '            ')}\n        ],\n`;
    }

    rustCode += `    ],
};
`;

    fs.writeFileSync(outputPath, rustCode);
    console.log(`Generated ${outputPath} (${nPublic} public inputs, ${icPoints.length} IC elements)`);
}

// Main
const circuitsDir = path.dirname(process.argv[1]);
const buildDir = path.join(circuitsDir, 'build');

try {
    // Convert withdraw key
    convertVkeyToSolana(
        path.join(buildDir, 'withdraw_vkey.json'),
        path.join(buildDir, 'withdraw_vk.rs'),
        'VERIFYINGKEY_WITHDRAW'
    );

    // Convert innocence key
    convertVkeyToSolana(
        path.join(buildDir, 'innocence_vkey.json'),
        path.join(buildDir, 'innocence_vk.rs'),
        'VERIFYINGKEY_INNOCENCE'
    );

    console.log('\nDone! Copy the generated .rs files to src/');
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
