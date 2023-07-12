import React from 'react'
import Taro from '@tarojs/taro'
import { View, Button, Text } from '@tarojs/components'
import './index.scss'

/**
 * 界面-Tab Bar
 * @returns 
 */

export default class Index extends React.Component {
    state = {
        list: [
            {
                id: 'showTabBarRedDot',
                func: null,
            }, 
            {
                id: 'showTabBar',
                func: null,
            }, 
            {
                id: 'setTabBarStyle',
                func: null,
            }, 
            {
                id: 'setTabBarItem',
                func: null,
            }, 
            {
                id: 'setTabBarBadge',
                func: null,
            }, 
            {
                id: 'removeTabBarBadge',
                func: null,
            }, 
            {
                id: 'hideTabBarRedDot',
                func: null,
            }, 
            {
                id: 'hideTabBar',
                func: null,
            }, 
        ], 
    }
    render () {
        return (
            <View className='api-page'>
                {
                    this.state.list.map((item) => {
                        return (
                            <Button
                                className='api-page-btn'
                                type='primary'
                                onClick={item.func == null ? () => {} : item.func}
                            >
                                {item.id}
                                {
                                    item.func == null && (<Text className='navigator-state tag'>未创建Demo</Text>)
                                }
                            </Button>
                        )
                    })
                }
            </View>
        )
    }
}
