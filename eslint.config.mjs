import antfu from '@antfu/eslint-config'
 
const config = new antfu({
  baseDirectory: import.meta.dirname,
})
 
const eslintConfig = [
  ...config.config({
    extends: ['next'],
  }),
]
 
export default eslintConfig