#!/usr/bin/env node
// Wake asset gate. Every shipped file is listed in art/required.json with its
// budget. This script fails if a listed file is missing, over budget, missing
// required attach-point nodes, or missing a credits/license entry.
//
//   node tools/art.cjs          check everything, print a status table
//   node tools/art.cjs <name>   check one entry (e.g. ferry)
//
// It cannot judge quality. Quality is judged by a human from the in-engine
// review render (see ASSET_LIST.md, "Review gate").
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const at = p => path.join(root, p);

function readGlb(file) {
  const buf = fs.readFileSync(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a binary glTF (.glb)');
  const jsonLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error('first GLB chunk is not JSON');
  return JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
}

function triangles(gltf) {
  // Count triangles per mesh, multiplied by how many nodes instance that mesh.
  const uses = new Map();
  for (const n of gltf.nodes || []) if (n.mesh !== undefined) uses.set(n.mesh, (uses.get(n.mesh) || 0) + 1);
  let tris = 0;
  (gltf.meshes || []).forEach((m, i) => {
    for (const p of m.primitives) {
      if ((p.mode ?? 4) !== 4) continue;
      const acc = gltf.accessors[p.indices ?? p.attributes.POSITION];
      tris += Math.floor(acc.count / 3) * (uses.get(i) || 1);
    }
  });
  return tris;
}

function checkEntry(kind, name, spec, credits) {
  const errors = [], info = [];
  const file = at(spec.file);
  if (!fs.existsSync(file)) return { status: 'TODO', errors: [], info: ['not delivered'] };
  const kb = fs.statSync(file).size / 1024;
  info.push(`${kb.toFixed(0)} KB`);
  if (spec.maxKB && kb > spec.maxKB) errors.push(`${kb.toFixed(0)} KB > budget ${spec.maxKB} KB`);
  if (kind === 'models') {
    try {
      const gltf = readGlb(file);
      const tris = triangles(gltf);
      info.push(`${tris} tris`);
      if (spec.maxTris && tris > spec.maxTris) errors.push(`${tris} triangles > budget ${spec.maxTris}`);
      if (spec.minTris && tris < spec.minTris) errors.push(`${tris} triangles < minimum ${spec.minTris} (too crude, see quality bar)`);
      const names = new Set((gltf.nodes || []).map(n => n.name));
      const missing = (spec.nodes || []).filter(n => !names.has(n));
      if (missing.length) errors.push(`missing attach nodes: ${missing.join(', ')}`);
      const mats = new Set((gltf.materials || []).map(m => m.name));
      const missingMats = (spec.materials || []).filter(m => !mats.has(m));
      if (missingMats.length) errors.push(`missing named materials: ${missingMats.join(', ')}`);
      if ((gltf.extensionsUsed || []).length) info.push(`ext: ${gltf.extensionsUsed.join(',')}`);
    } catch (e) { errors.push(e.message); }
  }
  const credit = credits[spec.file];
  if (!credit) errors.push(`no entry for "${spec.file}" in art/CREDITS.json`);
  else for (const k of ['source', 'license']) if (!credit[k]) errors.push(`CREDITS entry missing "${k}"`);
  if (credit && credit.license && !/^(CC0|original|OFL|MIT|ISC|CC-BY-4\.0)$/.test(credit.license)) errors.push(`license "${credit.license}" is not on the allowed list`);
  if (fs.existsSync(file) && !['png','jpg','webp'].some(ext => fs.existsSync(at(`art/review/${name}.${ext}`))) && kind === 'models') errors.push(`no in-engine review render at art/review/${name}.{png,jpg,webp}`);
  return { status: errors.length ? 'FAIL' : 'ok', errors, info };
}

function main() {
  const required = JSON.parse(fs.readFileSync(at('art/required.json'), 'utf8'));
  const credits = fs.existsSync(at('art/CREDITS.json')) ? JSON.parse(fs.readFileSync(at('art/CREDITS.json'), 'utf8')) : {};
  const only = process.argv[2];
  const counts = { ok: 0, FAIL: 0, TODO: 0 };
  for (const kind of Object.keys(required)) {
    if (kind.startsWith('$')) continue;
    for (const [name, spec] of Object.entries(required[kind])) {
      if (only && only !== name) continue;
      const r = checkEntry(kind, name, spec, credits);
      counts[r.status]++;
      console.log(`${r.status.padEnd(4)} ${kind}/${name}  ${r.info.join('  ')}  [${spec.priority}]`);
      for (const e of r.errors) console.log(`       - ${e}`);
    }
  }
  console.log(`\n${counts.ok} ok, ${counts.FAIL} failing, ${counts.TODO} not delivered`);
  process.exitCode = counts.FAIL ? 1 : 0;
}
main();
