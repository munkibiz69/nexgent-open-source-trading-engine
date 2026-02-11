const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the shared package from TypeScript source
  transpilePackages: ['@nexgent/shared'],
  
  webpack: (config, { webpack }) => {
    const sharedSrcPath = path.resolve(__dirname, '../shared/src');
    const fs = require('fs');
    
    // Rewrite .js imports to .ts files when they exist (for shared package)
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /\.js$/,
        (resource) => {
          // Only process relative imports that end in .js
          if (resource.request && /^\.\.?\/.*\.js$/.test(resource.request)) {
            // Only if we're resolving from within the shared package
            if (resource.context && resource.context.includes(sharedSrcPath)) {
              const tsPath = path.resolve(resource.context, resource.request.replace(/\.js$/, '.ts'));
              
              // If the .ts file exists, use it instead
              if (fs.existsSync(tsPath)) {
                resource.request = resource.request.replace(/\.js$/, '.ts');
              }
            }
          }
        }
      )
    );
    
    return config;
  },
};

module.exports = nextConfig;