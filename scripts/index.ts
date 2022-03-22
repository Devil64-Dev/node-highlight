import typescript from '@rollup/plugin-typescript';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { rollup, RollupBuild, RollupOptions } from 'rollup';

const inputOptions: RollupOptions = {
  input: 'src/index.ts',
  plugins: [typescript()],
};

const generateOutputs = async (bundle: RollupBuild) => {
  const { output } = await bundle.generate({
    exports: 'auto',
    file: 'dist/index.js',
    format: 'cjs',
  });

  output.forEach((chunkOrAsset) => {
    if (chunkOrAsset.type === 'chunk') {
      mkdirSync('dist', { recursive: true });
      writeFileSync('dist/core.js', chunkOrAsset.code, { encoding: 'utf-8' });
    }
  });
};

const _build = async () => {
  let bundle: RollupBuild;

  try {
    bundle = await rollup(inputOptions);
    await generateOutputs(bundle);
  } catch (err) {
    console.error(err);
  }

  if (bundle) {
    await bundle.close();
  }
};

const build = async () => {
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true });
  }
  await _build();

  cpSync('src/types', 'dist/types', { errorOnExist: false, recursive: true });
  cpSync('scripts/templates', 'dist', { errorOnExist: false, recursive: true });
  copyFileSync('README.md', 'dist/README.md');
};

build();
