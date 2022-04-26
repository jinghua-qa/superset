/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { dashboardView, nativeFilters } from 'cypress/support/directories';
import { testItems } from './dashboard.helper';

export const nativeFilterTooltips = {
  searchAllFilterOptions:
    'By default, each filter loads at most 1000 choices at the initial page load. Check this box if you have more than 1000 filter values and want to enable dynamically searching that loads filter values as users type (may add stress to your database).',
  defaultToFirstItem: 'When using this option, default value can’t be set',
  inverseSelection: 'Exclude selected values',
  required: 'User must select a value before applying the filter',
  multipleSelect: 'Allow selecting multiple values',
  defaultValue:
    'Default value must be set when "Filter value is required" is checked',
};

export const nativeFilterOptions = [
  'Filter has default value',
  'Multiple select',
  'Filter value is required',
  'Filter is hierarchical',
  'Default to first item',
  'Inverse selection',
  'Search all filter options',
  'Pre-filter available values',
  'Sort filter values',
];

export const valueNativeFilterOptions = [
  'Pre-filter available values',
  'Sort filter values',
  'Filter has default value',
  'Select first filter value by default',
  'Can select multiple values',
  'Dynamically search all filter values',
  'Inverse selection',
  'Filter value is required',
];

/** ************************************************************************
 * Expend Native filter from the left panel on dashboard
 * @returns {None}
 * @summary helper for expend native filter
 ************************************************************************* */
export function expandFilterOnLeftPanel() {
  return cy
    .get(nativeFilters.filterFromDashboardView.expand)
    .click({ force: true });
}

/** ************************************************************************
 * Collapes Native Filter from the left panel on dashboard
 * @returns {None}
 * @summary helper for collape native filter
 ************************************************************************* */
export function collapseFilterOnLeftPanel() {
  cy.get(nativeFilters.filterFromDashboardView.collapse)
    .should('be.visible')
    .click();
  cy.get(nativeFilters.filterFromDashboardView.collapse).should(
    'not.be.visible',
  );
}

/** ************************************************************************
 * Enter Native Filter edit modal from the left panel on dashboard
 * @returns {None}
 * @summary helper for enter native filter edit modal
 ************************************************************************* */
export function enterNativeFilterEditModal() {
  expandFilterOnLeftPanel();
  cy.get(nativeFilters.filterFromDashboardView.createFilterButton)
    .should('be.visible')
    .click();
  cy.get(nativeFilters.modal.container).should('be.visible');
}

/** ************************************************************************
 * Clicks on new filter button
 * @returns {None}
 * @summary helper for adding new filter
 ************************************************************************* */
export function clickOnAddFilterInModal() {
  return cy
    .get(nativeFilters.addFilterButton.button)
    .first()
    .click()
    .then(() => {
      cy.get(nativeFilters.addFilterButton.dropdownItem)
        .contains('Filter')
        .click({ force: true });
    });
}

/** ************************************************************************
 * Fills value native filter form with basic information
 * @param {string} type type for filter: Value, Numerical range,Time column,Time grain,Time range
 *  @param {string} name name for filter
 * @param {string} dataset which dataset should be used
 * @param {string} filterColumn which column should be used
 * @returns {None}
 * @summary helper for filling value native filter form
 ************************************************************************* */
export function fillNativeFilterForm(
  type: string,
  name: string,
  dataset?: string,
  filterColumn?: string,
) {
  cy.get(nativeFilters.filtersPanel.filterTypeInput)
    .find(nativeFilters.filtersPanel.filterTypeItem)
    .click({ multiple: true, force: true });
  cy.get(`[label="${type}"]`).click({ multiple: true, force: true });
  cy.get(nativeFilters.modal.container)
    .find(nativeFilters.filtersPanel.filterName)
    .last()
    .click({ scrollBehavior: false })
    .type(name, { scrollBehavior: false });
  if (dataset) {
    cy.get(nativeFilters.modal.container)
      .find(nativeFilters.filtersPanel.datasetName)
      .last()
      .click({ force: true, scrollBehavior: false })
      .type(`${dataset}`, { scrollBehavior: false });
    cy.get(nativeFilters.silentLoading).should('not.exist');
    cy.get(`[label="${dataset}"]`).click({ multiple: true, force: true });
  }
  cy.get(nativeFilters.silentLoading).should('not.exist');
  if (filterColumn) {
    cy.get(nativeFilters.filtersPanel.filterInfoInput)
      .last()
      .should('be.visible')
      .click({ force: true });
    cy.get(nativeFilters.filtersPanel.filterInfoInput)
      .last()
      .type(filterColumn);
    cy.get(nativeFilters.filtersPanel.inputDropdown)
      .should('be.visible', { timeout: 20000 })
      .last()
      .click();
  }
  cy.get(nativeFilters.silentLoading).should('not.exist');
}

/** ************************************************************************
 * Get native filter placeholder e.g 9 options
 * @param {number} index which input it fills
 * @returns cy object for assertions
 * @summary helper for getting placeholder value
 ************************************************************************* */
export function getNativeFilterPlaceholderWithIndex(index: number) {
  return cy.get(nativeFilters.filtersPanel.columnEmptyInput).eq(index);
}

/** ************************************************************************
 * Apply native filter value from dashboard view
 * @param {number} index which input it fills
 * @param {string} value what is filter value
 * @returns {null}
 * @summary put value to nth native filter input in view
 ************************************************************************* */
export function applyNativeFilterValueWithIndex(index: number, value: string) {
  cy.get(nativeFilters.filterFromDashboardView.filterValueInput)
    .eq(index)
    .parent()
    .should('be.visible', { timeout: 10000 })
    .type(`${value}{enter}`);
  // click the title to dismiss shown options
  cy.get(nativeFilters.filterFromDashboardView.filterName).eq(index).click();
}

/** ************************************************************************
 * Fills parent filter input
 * @param {number} index which input it fills
 * @param {string} value on which filter it depends on
 * @returns {null}
 * @summary takes first or second input and modify the depends on filter value
 ************************************************************************* */
export function addParentFilterWithValue(index: number, value: string) {
  return cy
    .get(nativeFilters.filterConfigurationSections.displayedSection)
    .within(() => {
      cy.get('input[aria-label="Limit type"]')
        .eq(index)
        .click({ force: true })
        .type(`${value}{enter}`, { delay: 30, force: true });
    });
}

/** ************************************************************************
 * Save Native Filter Settings
 * @returns {None}
 * @summary helper for save native filters settings
 ************************************************************************* */
export function saveNativeFilterSettings() {
  cy.get(nativeFilters.modal.footer)
    .contains('Save')
    .should('be.visible')
    .click();
  cy.get(nativeFilters.modal.container).should('not.exist');
}

/** ************************************************************************
 * Cancel Native fitler settings
 * @returns {None}
 * @summary helper for cancel native filters settings
 ************************************************************************* */
export function cancelNativeFilterSettings() {
  cy.get(nativeFilters.modal.footer)
    .find(nativeFilters.modal.cancelButton)
    .should('be.visible')
    .click();
  cy.get(nativeFilters.modal.alertXUnsavedFilters)
    .should('have.text', 'There are unsaved changes.')
    .should('be.visible');
  cy.get(nativeFilters.modal.footer)
    .find(nativeFilters.modal.yesCancelButton)
    .contains('cancel')
    .should('be.visible')
    .click();
  cy.get(nativeFilters.modal.container).should('not.exist');
}

/** ************************************************************************
 * Close dashboard toast message
 * @returns {None}
 * @summary helper for close dashboard toast message in order to make test stable
 ************************************************************************* */
export function closeDashboardToastMessage() {
  cy.get('body').then($body => {
    if ($body.find(dashboardView.dashboardAlert.modal).length > 0) {
      // evaluates as true if button exists at all
      cy.get(dashboardView.dashboardAlert.modal).then($header => {
        if ($header.is(':visible')) {
          cy.get(dashboardView.dashboardAlert.closeButton).click({
            force: true,
          });
          cy.get(dashboardView.dashboardAlert.closeButton).should('not.exist', {
            timeout: 10000,
          });
        }
      });
    }
  });
}

/** ************************************************************************
 * Validate filter name on dashboard
 * @param name: filter name to validate
 * @return {null}
 * @summary helper for validate filter name on dashboard
 ************************************************************************* */
export function validateFilterNameOnDashboard(name: string) {
  cy.get(nativeFilters.filterFromDashboardView.filterName)
    .should('be.visible', { timeout: 40000 })
    .contains(`${name}`);
}

/** ************************************************************************
 * Validate filter content on dashboard
 * @param filterContent: filter content to validate
 * @return {null}
 * @summary helper for validate filter content on dashboard
 ************************************************************************* */
export function validateFilterContentOnDashboard(filterContent: string) {
  cy.get(nativeFilters.filterFromDashboardView.filterContent)
    .contains(`${filterContent}`)
    .should('be.visible');
}

/** ************************************************************************
 * Delete Native filter
 * @return {null}
 * @summary helper for delete native filter
 ************************************************************************* */
export function deleteNativeFilter() {
  cy.get(nativeFilters.filtersList.removeIcon).first().click();
}

/** ************************************************************************
 * Undo delete Native filter
 * @return {null}
 * @summary helper for undo delete native filter
 ************************************************************************ */
export function undoDeleteNativeFilter() {
  deleteNativeFilter();
  cy.contains('Undo?').click();
}

/** ************************************************************************
 * Check Native Filter tooltip content
 * @param index: tooltip indext to check
 * @param value: tooltip value to check
 * @return {null}
 * @summary helper for checking native filter tooltip content by index
 ************************************************************************* */
export function checkNativeFilterTooltip(index: number, value: string) {
  cy.get(nativeFilters.filterConfigurationSections.infoTooltip)
    .eq(index)
    .trigger('mouseover');
  cy.contains(`${value}`);
}

/** ************************************************************************
 * Apply advanced time range filter on dashboard
 * @param startRange: starting time range
 * @param endRange: ending time range
 * @return {null}
 * @summary helper for applying advanced time range filter on dashboard with customize time range
 ************************************************************************* */
export function applyAdvancedTimeRangeFilterOnDashboard(
  startRange?: string,
  endRange?: string,
) {
  cy.get('.control-label').contains('RANGE TYPE').should('be.visible');
  cy.get('.ant-popover-content .ant-select-selector')
    .should('be.visible')
    .click();
  cy.get(`[label="Advanced"]`).should('be.visible').click();
  cy.get('.section-title').contains('Advanced Time Range').should('be.visible');
  if (startRange) {
    cy.get('.ant-popover-inner-content')
      .find('[class^=ant-input]')
      .first()
      .type(`${startRange}`);
  }
  if (endRange) {
    cy.get('.ant-popover-inner-content')
      .find('[class^=ant-input]')
      .last()
      .type(`${endRange}`);
  }
  cy.get(dashboardView.timeRangeModal.applyButton).click();
  cy.get(nativeFilters.applyFilter).click();
}

/** ************************************************************************
 * Input default valule in Native filter in filter settings
 * @param defaultValue: default value for native filter
 * @return {null}
 * @summary helper for input default valule in Native filter in filter settings
 ************************************************************************* */
export function inputNativeFilterDefaultValue(defaultValue: string) {
  cy.contains('Filter has default value').click();
  cy.contains('Default value is required').should('be.visible');
  cy.get(nativeFilters.filterConfigurationSections.filterPlaceholder)
    .contains('options')
    .should('be.visible');
  cy.get(nativeFilters.filterConfigurationSections.collapsedSectionContainer)
    .first()
    .get(nativeFilters.filtersPanel.columnEmptyInput)
    .type(`${defaultValue}{enter}`);
}

/** ************************************************************************
 * add filter for test column 'Country name'
 * @return {null}
 * @summary helper for add filter for test column 'Country name'
 ************************************************************************* */
export function addCountryNameFilter() {
  fillNativeFilterForm(
    testItems.filterType.value,
    testItems.topTenChart.filterColumn,
    testItems.datasetForNativeFilter,
    testItems.topTenChart.filterColumn,
  );
}

/** ************************************************************************
 * add filter for test column 'Region'
 * @return {null}
 * @summary helper for add filter for test column 'Region'
 ************************************************************************* */
export function addRegionFilter() {
  fillNativeFilterForm(
    testItems.filterType.value,
    testItems.topTenChart.filterColumnRegion,
    testItems.datasetForNativeFilter,
    testItems.topTenChart.filterColumnRegion,
  );
}

/** ************************************************************************
 * add filter for test column 'Country Code'
 * @return {null}
 * @summary helper for add filter for test column 'Country Code'
 ************************************************************************* */
export function addCountryCodeFilter() {
  fillNativeFilterForm(
    testItems.filterType.value,
    testItems.topTenChart.filterColumnCountryCode,
    testItems.datasetForNativeFilter,
    testItems.topTenChart.filterColumnCountryCode,
  );
}
