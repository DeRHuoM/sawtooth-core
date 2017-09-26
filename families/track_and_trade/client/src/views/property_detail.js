/**
 * Copyright 2017 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ----------------------------------------------------------------------------
 */
'use strict'

const m = require('mithril')
const _ = require('lodash')

const api = require('../services/api')
const payloads = require('../services/payloads')
const parsing = require('../services/parsing')
const transactions = require('../services/transactions')
const layout = require('../components/layout')
const { Table, PagingButtons } = require('../components/tables.js')

const PAGE_SIZE = 50

const updateSubmitter = state => e => {
  e.preventDefault()
  const { name, dataType, recordId } = state.property
  const update = { name }
  update.dataType = payloads.updateProperties.enum[dataType]
  update[`${dataType.toLowerCase()}Value`] = state.update

  const payload = payloads.updateProperties({
    recordId,
    properties: [update]
  })

  transactions.submit(payload, true)
    .then(() => api.get(`records/${recordId}/${name}`))
    .then(property => {
      e.target.elements[0].value = null
      state.update = null
      state.property = property
    })
}

const updateForm = state => {
  return m('form.my-5', {
    onsubmit: updateSubmitter(state)
  }, [
    m('.container',
      m('.row.justify-content-center',
        m('.col-md-8',
          m('input.form-control', {
            oninput: m.withAttr('value', value => { state.update = value })
          })),
        m('.col-md-2',
          m('button.btn.btn-primary', { type: 'submit' }, 'Update'))))
  ])
}

/**
 * Displays updates to a property, and form for submitting new updates.
 */
const PropertyDetailPage = {
  oninit (vnode) {
    vnode.state.currentPage = 0

    api.get(`records/${vnode.attrs.recordId}/${vnode.attrs.name}`)
      .then(property => { vnode.state.property = property })
  },

  view (vnode) {
    const name = _.capitalize(vnode.attrs.name)
    const record = vnode.attrs.recordId

    const reporters = _.get(vnode.state, 'property.reporters', [])
    const isReporter = reporters.includes(api.getPublicKey())

    const updates = _.get(vnode.state, 'property.updates', [])
    const page = updates.slice(vnode.state.currentPage * PAGE_SIZE,
                               (vnode.state.currentPage + 1) * PAGE_SIZE)

    return [
      layout.title(`${name} of ${record}`),
      isReporter ? updateForm(vnode.state) : null,
      m('.container',
        layout.row([
          m('h5.mr-auto', 'Update History'),
          m(PagingButtons, {
            setPage: page => { vnode.state.currentPage = page },
            currentPage: vnode.state.currentPage,
            maxPage: updates.length / PAGE_SIZE
          })
        ]),
        m(Table, {
          headers: ['Value', 'Reporter', 'Time'],
          rows: page.map(update => {
            return [
              JSON.stringify(update.value, null, 1).replace(/[{}"]/g, ''),
              update.reporter.name,
              parsing.formatTimestamp(update.timestamp)
            ]
          }),
          noRowsText: 'This property has never been updated'
        }))
    ]
  }
}

module.exports = PropertyDetailPage