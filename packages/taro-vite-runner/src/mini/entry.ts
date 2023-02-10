import path from 'path'

import { getCompiler, prettyPrintJson } from '../utils'
import { baseCompName, customWrapperName } from '../utils/constants'

import type { PluginOption } from 'vite'

const ENTRY_SUFFIX = '?entry-loader=true'

export default function (/* taroConfig: MiniBuildConfig */): PluginOption {
  return {
    name: 'taro:vite-mini-entry',
    enforce: 'pre',
    resolveId (source, _importer, options) {
      const compiler = getCompiler(this)
      if (compiler?.isApp(source) && options.isEntry) {
        return '\0' + source + ENTRY_SUFFIX
      }
      return null
    },
    load (id) {
      const compiler = getCompiler(this)
      if (compiler && id.endsWith(ENTRY_SUFFIX)) {
        const rawId = id.replace(/^\0/, '').replace(ENTRY_SUFFIX, '')
        const { taroConfig } = compiler
        const runtimePath = Array.isArray(taroConfig.runtimePath) ? taroConfig.runtimePath : [taroConfig.runtimePath]
        let setReconcilerPost = ''
        const setReconciler = runtimePath.reduce((res, item) => {
          if (item && /^post:/.test(item)) {
            setReconcilerPost += `import '${item.replace(/^post:/, '')}'\n`
            return res
          } else {
            return res + `import '${item}'\n`
          }
        }, '')

        const { importFrameworkStatement, frameworkArgs, creator, creatorLocation, modifyInstantiate } = compiler.loaderMeta
        const createApp = `${creator}(component, ${frameworkArgs})`

        const appConfig = prettyPrintJson(compiler.app.config)

        let instantiateApp = taroConfig.blended
          ? [
            `\nvar app = ${createApp}`,
            'app.onLaunch()',
            'exports.taroApp = app'
          ].join('\n')
          : `var inst = App(${createApp})`

        if (typeof modifyInstantiate === 'function') {
          instantiateApp = modifyInstantiate(instantiateApp, 'app')
        }

        // pages
        compiler.pages.forEach(page => {
          this.emitFile({
            type: 'chunk',
            id: page.scriptPath,
            fileName: compiler.getScriptPath(page.name),
            implicitlyLoadedAfterOneOf: [rawId]
          })
        })

        if (!compiler.taroConfig.template.isSupportRecursive) {
          this.emitFile({
            type: 'chunk',
            id: path.resolve(__dirname, '../template/comp'),
            fileName: compiler.getScriptPath(baseCompName),
            implicitlyLoadedAfterOneOf: [rawId]
          })
        }

        this.emitFile({
          type: 'chunk',
          id: path.resolve(__dirname, '../template/custom-wrapper'),
          fileName: compiler.getScriptPath(customWrapperName),
          implicitlyLoadedAfterOneOf: [rawId]
        })

        return [
          setReconciler,
          'import { window } from "@tarojs/runtime"',
          `import { ${creator} } from "${creatorLocation}"`,
          'import { initPxTransform } from "@tarojs/taro"',
          setReconcilerPost,
          `import component from "${rawId}"`,
          importFrameworkStatement,
          `var config = ${appConfig};`,
          'window.__taroAppConfig = config',
          instantiateApp,
          'initPxTransform({',
          `designWidth: ${taroConfig.designWidth || 750},`,
          `deviceRatio: ${JSON.stringify(taroConfig.deviceRatio || { 750: 1 })}`,
          '})'
        ].join('\n')
      }
    }
  }
}
