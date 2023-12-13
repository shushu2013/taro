import { Current } from '@tarojs/runtime'
import { eventSource } from '@tarojs/runtime/dist/runtime.esm'

import {
  ButtonProps,
  CheckboxGroupProps,
  CheckboxProps,
  IconProps,
  ImageProps, InputProps,
  LabelProps,
  PickerDateProps,
  PickerMultiSelectorProps,
  PickerSelectorProps,
  PickerTimeProps,
  RadioGroupProps,
  RadioProps,
  RichTextProps,
  ScrollViewProps,
  SliderProps,
  StandardProps,
  SwiperItemProps,
  SwiperProps,
  SwitchProps,
  TextareaProps,
  TextProps,
  VideoProps,
  ViewProps
} from '../../components/types'
import { ATTRIBUTES_CALLBACK_TRIGGER_MAP, ID } from '../constant'
import { ClassList } from '../dom/class-list'
import { findChildNodeWithDFS } from '../utils'
import { initComponentNodeInfo, triggerAttributesCallback } from '../utils/info'
import { bindAnimation, bindFocus, bindScrollTo } from './bind'
import { createTaroEvent, eventHandler,TaroEvent } from './event'
import { NodeType, TaroNode, TaroTextNode } from './node'
import StyleSheet from './stylesheet'

import type { TaroAny } from '../utils'
import type { ICSSStyleDeclaration } from './cssStyleDeclaration'

type NamedNodeMap = ({ name: string, value: string })[]

interface FormWidgetProps extends TaroAttributeProps {
  name?: string
  value?: string | number | number[] | string[] | Record<string, TaroAny>[]
}

export interface TaroAttributeProps extends StandardProps {
  compileMode?: string | boolean
  compileIf?: boolean
  disabled?: boolean
}

class TaroElement<T extends TaroAttributeProps = TaroAttributeProps> extends TaroNode {
  public _innerHTML = ''
  public readonly tagName: string
  public _attrs: T = {} as T
  public _nodeInfo: TaroAny = {}

  constructor(tagName: string) {
    super(tagName.replace(new RegExp('(?<=.)([A-Z])', 'g'), '-$1').toUpperCase(), NodeType.ELEMENT_NODE)
    this.tagName = this.nodeName

    initComponentNodeInfo(this)
    bindAnimation(this)
  }

  public set id (value: string) {
    this.setAttribute('id', value)
  }

  public get id (): string {
    return this.getAttribute('id') || this._nid
  }

  public set className (value: string) {
    this.setAttribute('class', value)
  }

  public get className (): string {
    return this.getAttribute('class') || ''
  }

  public get classList (): ClassList {
    return new ClassList(this.className, this)
  }

  public get attributes (): NamedNodeMap {
    const list: NamedNodeMap = []

    Object.keys(this._attrs).forEach(name => {
      const value: TaroAny = this._attrs[name]

      list.push({ name, value })
    })

    return list
  }

  public get children (): TaroElement[] {
    return this.childNodes.filter(node => node.nodeType === NodeType.ELEMENT_NODE) as TaroElement[]
  }

  public setAttribute (name: string, value: TaroAny): void {
    if (name === ID) {
      eventSource.delete(this._attrs.id)
      eventSource.set(value, this as TaroAny)
    }

    this._attrs[name] = value

    const attributeTriggerValue: TaroAny = ATTRIBUTES_CALLBACK_TRIGGER_MAP[name]
    if (attributeTriggerValue) {
      const triggerName: TaroAny = attributeTriggerValue.triggerName
      const valueInspect: TaroAny = attributeTriggerValue.valueInspect

      if (valueInspect && !valueInspect(value)) return

      triggerAttributesCallback(this, triggerName)
    }
  }

  public getAttribute (name: string): string {
    return this._attrs[name]
  }

  public removeAttribute (name: string): void {
    this._attrs[name] = null
  }

  public hasAttribute (name: string): boolean {
    return !!this._attrs[name]
  }

  public hasAttributes (): boolean {
    return Object.keys(this._attrs).length > 0
  }

  public getElementById (id: string | undefined | null) {
    return findChildNodeWithDFS(this as TaroAny, (el) => {
      return el.id === id
    }, false)
  }

  public getElementsByTagName<T> (tagName: string) {
    return findChildNodeWithDFS(this as TaroAny, (el) => {
      return el.nodeName === tagName || (tagName === '*' && this as TaroAny !== el)
    }, true) || []
  }

  public getElementsByClassName (className: string) {
    const classNames = className.trim().split(new RegExp('\s+'))

    return findChildNodeWithDFS(this as TaroAny, (el) => {
      const classList = el.classList
      return classNames.every(c => {
        const bool = classList.contains(c)

        return bool
      })
    }, true) || []
  }

  // TODO dataset

  public set innerHTML (value: string) {
    if (this.nodeType === NodeType.ELEMENT_NODE && this.ownerDocument) {
      const ele = this.ownerDocument.createElement('inner-html')
      ele._innerHTML = value
      this.appendChild(ele as TaroAny)
    }
  }

  public get innerHTML (): string {
    return this._innerHTML
  }

  public _st = new StyleSheet()

  // 经转换后的鸿蒙样式
  public get hmStyle () {
    return this._st.hmStyle
  }

  public _style: ICSSStyleDeclaration | null = null

  public get style (): ICSSStyleDeclaration | null {
    return this._style
  }
}

class TaroViewElement extends TaroElement<ViewProps> {
  constructor() {
    super('View')
  }
}

class TaroTextElement extends TaroElement<TextProps> {
  constructor() {
    super('Text')
  }
}

class TaroImageElement extends TaroElement<ImageProps> {
  constructor() {
    super('Image')
  }
}

class TaroScrollViewElement extends TaroElement<ScrollViewProps> {
  scroller: Scroller = new Scroller()

  constructor() {
    super('ScrollView')

    bindScrollTo(this)
  }
}

class TaroButtonElement extends TaroElement<ButtonProps> {
  constructor() {
    super('Button')
  }
}

class TaroFormWidgetElement<T extends FormWidgetProps = FormWidgetProps> extends TaroElement<T> {
  _value: TaroAny = ''

  constructor (tagName: string) {
    super(tagName)

    bindFocus(this)
  }

  public get name () {
    return this._attrs.name || ''
  }

  public set name (val: string) {
    this._attrs.name = val
  }

  public get value () {
    return ''
  }

  public set value (val: TaroAny) {
    this._value = val
    this._attrs.value = val
  }
}

class TaroInputElement extends TaroFormWidgetElement<InputProps> {
  text = ''

  constructor() {
    super('Input')

    this.text = this._attrs.value || ''
  }

  public get value () {
    return this.text
  }

  public set value (val: string) {
    this.text = val
    this._attrs.value = val
    // TODO: update
  }
}

class TaroSliderElement extends TaroElement<SliderProps> {
  _value: string | number = ''

  constructor() {
    super('Slider')

    this._value = this._attrs.value || ''
  }

  public get value () {
    return this._value
  }

  public set value (val: string | number) {
    this._value = val
    // TODO: update
  }
}

class TaroSwitchElement extends TaroElement<SwitchProps> {
  _value = false

  constructor() {
    super('Switch')

    this._value = this._attrs.checked || false
  }

  public get value () {
    return this._value
  }

  public set value (val: boolean) {
    this._value = val
    // TODO: update
  }
}

class TaroCheckboxGroupElement extends TaroFormWidgetElement<CheckboxGroupProps> {
  constructor() {
    super('CheckboxGroup')
  }

  public get value () {
    // TODO: 待完善
    return null
    // if (this._instance) {
    //   return this._instance.getValues()
    // }
  }
}

class TaroRadioGroupElement extends TaroFormWidgetElement<RadioGroupProps> {
  constructor() {
    super('RadioGroup')
  }

  public get value () {
    // TODO: 待完善
    return null
    // if (this._instance) {
    //   return this._instance.getValues()
    // }
  }
}

class TaroPickerElement extends TaroFormWidgetElement<PickerSelectorProps | PickerTimeProps | PickerDateProps | PickerMultiSelectorProps> {
  select: TaroAny

  constructor() {
    super('Picker')
  }

  public get value () {
    if (this.select instanceof Array) {
      return this.select.join(',')
    }

    return this.select
  }

  public set value (val: TaroAny) {
    this.select = val
  }
}

class TaroVideoElement extends TaroElement<VideoProps> {
  _currentTime = 0

  controller: VideoController = new VideoController()

  constructor() {
    super('Video')
  }

  async play() {
    try {
      this.controller.start()
      return Promise.resolve()
    } catch (e) {
      return Promise.reject(e)
    }
  }

  pause() {
    try {
      this.controller.pause()
      return Promise.resolve()
    } catch (e) {
      return Promise.reject(e)
    }
  }

  stop() {
    try {
      this.controller.stop()
      return Promise.resolve()
    } catch (e) {
      return Promise.reject(e)
    }
  }

  get currentTime() {
    return this._currentTime
  }

  set currentTime(val: number) {
    this._currentTime = val
    this.controller.setCurrentTime(val)
  }
}

class TaroCheckboxElement extends TaroElement<CheckboxProps>{
  constructor() {
    super('Checkbox')
  }
}

class TaroRadioElement extends TaroElement<RadioProps>{
  constructor() {
    super('Radio')
  }

  public group?: string
}

class TaroIconElement extends TaroElement<IconProps>{
  constructor() {
    super('Icon')
  }
}

class TaroLabelElement extends TaroElement<LabelProps>{
  constructor() {
    super('Label')
  }
}

class TaroRichTextElement extends TaroElement<RichTextProps>{
  constructor() {
    super('RichText')
  }
}

class TaroSwiperElement extends TaroElement<SwiperProps>{
  constructor() {
    super('Swiper')
  }
}

class TaroSwiperItemElement extends TaroElement<SwiperItemProps>{
  constructor() {
    super('SwiperItem')
  }
}

class TaroTextAreaElement extends TaroElement<TextareaProps>{
  constructor() {
    super('TextArea')
  }
}

class TaroFormElement extends TaroFormWidgetElement {
  constructor() {
    super('Form')

    // 监听submit冒泡
    this.addEventListener('submit-btn', (e: TaroEvent) => {
      e.stopPropagation()
      const formResult: Record<string, string> = {}
      findChildNodeWithDFS<TaroFormWidgetElement>(this as TaroElement, item => {
        switch (item.nodeName) {
          case 'INPUT':
          case 'SLIDER':
          case 'SWITCH':
          case 'RADIO-GROUP':
          case 'CHECKBOX-GROUP':
          case 'PICKER': {
            formResult[item.name] = item.value
            break
          }
        }
        return false
      }, true)
      const event: TaroEvent = createTaroEvent('submit', { detail: { value: formResult } }, this)
      eventHandler(event, 'submit', this)
    })

    // 监听reset冒泡
    this.addEventListener('reset-btn', (e: TaroEvent) => {
      findChildNodeWithDFS(this, (item: TaroFormWidgetElement) => {
        e.stopPropagation()
        switch (item.nodeName) {
          case 'INPUT': {
            item.value = (item as TaroInputElement)._attrs.value
            break
          }
          case 'SLIDER': {
            item.value = (item as TaroSliderElement)._attrs.value
            break
          }
          case 'SWITCH': {
            item.value = (item as TaroSwitchElement)._attrs.checked
            break
          }
          case 'RADIO-GROUP': {
            item.getElementsByTagName<TaroRadioElement>('RADIO').forEach((element: TaroRadioElement) => {
              element.checked = element._attrs.checked || false
              element.updateComponent()
            })
            break
          }
          case 'CHECKBOX-GROUP': {
            item.getElementsByTagName<TaroCheckboxElement>('CHECKBOX').forEach((element: TaroCheckboxElement) => {
              element.checked = element._attrs.checked || false
              element.updateComponent()
            })
            break
          }
          case 'PICKER': {
            item.value = (item as TaroPickerElement)._attrs.value
            break
          }
        }
        return false
      }, true)
    })
  }

  public get value () {
    const val = this._attrs.value
    return val == null ? '' : val
  }

  public set value (val: string | boolean | number | TaroAny[]) {
    this.setAttribute('value', val)
  }
}

const FormElement = TaroFormElement

export function initHarmonyElement () {
  Current.createHarmonyElement = (tagName: string) => {
    switch (tagName) {
      case 'view': return new TaroViewElement()
      case 'image': return new TaroImageElement()
      case 'text': return new TaroTextElement()
      case 'button': return new TaroButtonElement()
      case 'scroll-view': return new TaroScrollViewElement()
      case 'checkbox-group': return new TaroCheckboxGroupElement()
      case 'input': return new TaroInputElement()
      case 'picker': return new TaroPickerElement()
      case 'radio-group': return new TaroRadioGroupElement()
      case 'slider': return new TaroSliderElement()
      case 'switch': return new TaroSwitchElement()
      case 'video': return new TaroVideoElement()
      case 'checkbox': return new TaroCheckboxElement()
      case 'radio': return new TaroRadioElement()
      case 'icon': return new TaroIconElement()
      case 'label': return new TaroLabelElement()
      case 'rich-text': return new TaroRichTextElement()
      case 'swiper': return new TaroSwiperElement()
      case 'swiper-item': return new TaroSwiperItemElement()
      case 'text-area': return new TaroTextAreaElement()
      case 'form': return new TaroFormElement()
      default: return new TaroElement(tagName)
    }
  }

  Current.createTextNode = (value: string): TaroTextNode => {
    const node = new TaroTextNode(value)
    return node
  }
}

export {
  FormElement,
  TaroButtonElement,
  TaroCheckboxElement,
  TaroCheckboxGroupElement,
  TaroElement,
  TaroFormElement,
  TaroFormWidgetElement,
  TaroIconElement,
  TaroImageElement,
  TaroInputElement,
  TaroLabelElement,
  TaroPickerElement,
  TaroRadioElement,
  TaroRadioGroupElement,
  TaroRichTextElement,
  TaroScrollViewElement,
  TaroSliderElement,
  TaroSwiperElement,
  TaroSwiperItemElement,
  TaroSwitchElement,
  TaroTextAreaElement,
  TaroTextElement,
  TaroVideoElement,
  TaroViewElement
}
