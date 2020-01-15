const path = require('path')
const fs = require('fs')

const buildUtils = require('./build.utils')

function resolve (_path) {
  return path.resolve(__dirname, '..', _path)
}

const svgIconSetBanner = setName => `
/*
 * Do not edit this file. It is automatically generated
 * from its webfont counterpart (same filename without "svg-" prefix).
 * Edit that file instead (${setName}.js).
 */
`

module.exports.generate = function () {
  // generic conversion
  const convert = str => str.replace(/(-\w)/g, m => m[1].toUpperCase())

  const iconTypes = [
    {
      name: 'material-icons',
      regex: /_/,
      convert: str => ('mat_' + str).replace(/(_\w)/g, m => m[1].toUpperCase())
    },
    {
      name: 'mdi-v4',
      regex: /^mdi-/,
      convert
    },
    {
      name: 'ionicons-v4',
      regex: /^ion-/,
      convert: str => (/ion-(md|ios)-/.test(str) === true ? str : str.replace(/ion-/, 'ion-md-'))
        .replace(/(-\w)/g, m => m[1].toUpperCase())
    },
    {
      name: 'fontawesome-v5',
      regex: /^fa[brs] fa-/,
      convert: str => str.replace(' fa-', '-').replace(/(-\w)/g, m => m[1].toUpperCase())
    },
    {
      name: 'eva-icons',
      regex: /^eva-/,
      convert
    },
    {
      name: 'themify',
      regex: /^ti-/,
      convert
    }
  ]

  function convertWebfont (name) {
    const type = iconTypes.find(type => type.regex.test(name)) || iconTypes[0]

    return {
      importName: type.name,
      variableName: type.convert(name)
    }
  }

  function toObject (arr) {
    const obj = {}
    arr.forEach(item => {
      obj[item] = []
    })
    return obj
  }

  const iconNames = iconTypes.map(type => type.name)

  return Promise.all(
    iconTypes.map(type => {
      const original = fs.readFileSync(resolve(`icon-set/${type.name}.js`), 'utf-8')

      const importList = toObject(iconNames)

      const contentString = original
        .replace(/name: '(.+)'/, `name: ""`)
        .replace(/'(.+)'/g, m => {
          const { importName, variableName } = convertWebfont(m.substring(1, m.length - 1))
          if (!importList[importName].includes(variableName)) {
            importList[importName].push(variableName)
          }
          return variableName
        })
        .replace(/name: ""/, `name: 'svg-${type.name}'`)

      const importString = Object.keys(importList)
        .filter(listName => importList[listName].length > 0)
        .map(listName => `import {\n  ` + importList[listName].join(',\n  ') + `\n} from '@quasar/extras/${listName}'`)
        .join('\n\n')

      const content = svgIconSetBanner(type.name) + '\n' + importString + '\n\n' + contentString

      const iconFile = resolve(`icon-set/svg-${type.name}.js`)

      let oldContent = ''

      try {
        oldContent = fs.readFileSync(iconFile, 'utf-8')
      }
      catch (e) { }

      return content.split(/[\n\r]+/).join('\n') !== oldContent.split(/[\n\r]+/).join('\n')
        ? buildUtils.writeFile(iconFile, content, 'utf-8')
        : Promise.resolve()
    })
  )
}
