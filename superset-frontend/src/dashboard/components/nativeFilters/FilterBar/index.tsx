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

/* eslint-disable no-param-reassign */
import {
  DataMaskStateWithId,
  DataMaskWithId,
  Filter,
  NativeFilterType,
  DataMask,
  HandlerFunction,
  styled,
  t,
  SLOW_DEBOUNCE,
} from '@superset-ui/core';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import cx from 'classnames';
import Icons from 'src/components/Icons';
import { Tabs } from 'src/common/components';
import { useHistory } from 'react-router-dom';
import { usePrevious } from 'src/hooks/usePrevious';
import { FeatureFlag, isFeatureEnabled } from 'src/featureFlags';
import { updateDataMask, clearDataMask } from 'src/dataMask/actions';
import { useImmer } from 'use-immer';
import { isEmpty, isEqual, debounce } from 'lodash';
import { testWithId } from 'src/utils/testUtils';
import Loading from 'src/components/Loading';
import { getInitialDataMask } from 'src/dataMask/reducer';
import { URL_PARAMS } from 'src/constants';
import { getUrlParam } from 'src/utils/urlUtils';
import { EmptyStateSmall } from 'src/components/EmptyState';
import { useTabId } from 'src/hooks/useTabId';
import { checkIsApplyDisabled, TabIds } from './utils';
import FilterSets from './FilterSets';
import {
  useNativeFiltersDataMask,
  useFilters,
  useFilterSets,
  useFilterUpdates,
  useInitialization,
} from './state';
import { createFilterKey, updateFilterKey } from './keyValue';
import EditSection from './FilterSets/EditSection';
import Header from './Header';
import FilterControls from './FilterControls/FilterControls';
import { RootState } from '../../../types';
import { ActionButtons } from './ActionButtons';

export const FILTER_BAR_TEST_ID = 'filter-bar';
export const getFilterBarTestId = testWithId(FILTER_BAR_TEST_ID);

const BarWrapper = styled.div<{ width: number }>`
  width: ${({ theme }) => theme.gridUnit * 8}px;

  & .ant-tabs-top > .ant-tabs-nav {
    margin: 0;
  }
  &.open {
    width: ${({ width }) => width}px; // arbitrary...
  }
`;

const Bar = styled.div<{ width: number }>`
  & .ant-typography-edit-content {
    left: 0;
    margin-top: 0;
    width: 100%;
  }
  position: absolute;
  top: 0;
  left: 0;
  flex-direction: column;
  flex-grow: 1;
  width: ${({ width }) => width}px;
  background: ${({ theme }) => theme.colors.grayscale.light5};
  border-right: 1px solid ${({ theme }) => theme.colors.grayscale.light2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.grayscale.light2};
  min-height: 100%;
  display: none;
  &.open {
    display: flex;
  }
`;

const CollapsedBar = styled.div<{ offset: number }>`
  position: absolute;
  top: ${({ offset }) => offset}px;
  left: 0;
  height: 100%;
  width: ${({ theme }) => theme.gridUnit * 8}px;
  padding-top: ${({ theme }) => theme.gridUnit * 2}px;
  display: none;
  text-align: center;
  &.open {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: ${({ theme }) => theme.gridUnit * 2}px;
  }
  svg {
    cursor: pointer;
  }
`;

const StyledCollapseIcon = styled(Icons.Collapse)`
  color: ${({ theme }) => theme.colors.primary.base};
  margin-bottom: ${({ theme }) => theme.gridUnit * 3}px;
`;

const StyledFilterIcon = styled(Icons.Filter)`
  color: ${({ theme }) => theme.colors.grayscale.base};
`;

const StyledTabs = styled(Tabs)`
  & .ant-tabs-nav-list {
    width: 100%;
  }
  & .ant-tabs-tab {
    display: flex;
    justify-content: center;
    margin: 0;
    flex: 1;
  }

  & > .ant-tabs-nav .ant-tabs-nav-operations {
    display: none;
  }
`;

const FilterBarEmptyStateContainer = styled.div`
  margin-top: ${({ theme }) => theme.gridUnit * 8}px;
`;

export interface FiltersBarProps {
  filtersOpen: boolean;
  toggleFiltersBar: any;
  directPathToChild?: string[];
  width: number;
  height: number | string;
  offset: number;
}

const publishDataMask = debounce(
  async (
    history,
    dashboardId,
    updateKey,
    dataMaskSelected: DataMaskStateWithId,
    tabId,
  ) => {
    const { location } = history;
    const { search } = location;
    const previousParams = new URLSearchParams(search);
    const newParams = new URLSearchParams();
    let dataMaskKey: string;
    previousParams.forEach((value, key) => {
      if (key !== URL_PARAMS.nativeFilters.name) {
        newParams.append(key, value);
      }
    });

    const nativeFiltersCacheKey = getUrlParam(URL_PARAMS.nativeFiltersKey);
    const dataMask = JSON.stringify(dataMaskSelected);
    if (
      updateKey &&
      nativeFiltersCacheKey &&
      (await updateFilterKey(
        dashboardId,
        dataMask,
        nativeFiltersCacheKey,
        tabId,
      ))
    ) {
      dataMaskKey = nativeFiltersCacheKey;
    } else {
      dataMaskKey = await createFilterKey(dashboardId, dataMask, tabId);
    }
    newParams.set(URL_PARAMS.nativeFiltersKey.name, dataMaskKey);

    // pathname could be updated somewhere else through window.history
    // keep react router history in sync with window history
    history.location.pathname = window.location.pathname;
    history.replace({
      search: newParams.toString(),
    });
  },
  SLOW_DEBOUNCE,
);

const FilterBar: React.FC<FiltersBarProps> = ({
  filtersOpen,
  toggleFiltersBar,
  directPathToChild,
  width,
  height,
  offset,
}) => {
  const history = useHistory();
  const dataMaskApplied: DataMaskStateWithId = useNativeFiltersDataMask();
  const [editFilterSetId, setEditFilterSetId] = useState<number | null>(null);
  const [dataMaskSelected, setDataMaskSelected] =
    useImmer<DataMaskStateWithId>(dataMaskApplied);
  const dispatch = useDispatch();
  const [updateKey, setUpdateKey] = useState(0);
  const tabId = useTabId();
  const filterSets = useFilterSets();
  const filterSetFilterValues = Object.values(filterSets);
  const [tab, setTab] = useState(TabIds.AllFilters);
  const filters = useFilters();
  const previousFilters = usePrevious(filters);
  const filterValues = Object.values<Filter>(filters);
  const dashboardId = useSelector<any, string>(
    ({ dashboardInfo }) => dashboardInfo?.id,
  );
  const canEdit = useSelector<RootState, boolean>(
    ({ dashboardInfo }) => dashboardInfo.dash_edit_perm,
  );

  const handleFilterSelectionChange = useCallback(
    (
      filter: Pick<Filter, 'id'> & Partial<Filter>,
      dataMask: Partial<DataMask>,
    ) => {
      setDataMaskSelected(draft => {
        // force instant updating on initialization for filters with `requiredFirst` is true or instant filters
        if (
          // filterState.value === undefined - means that value not initialized
          dataMask.filterState?.value !== undefined &&
          dataMaskSelected[filter.id]?.filterState?.value === undefined &&
          filter.requiredFirst
        ) {
          dispatch(updateDataMask(filter.id, dataMask));
        }

        draft[filter.id] = {
          ...(getInitialDataMask(filter.id) as DataMaskWithId),
          ...dataMask,
        };
      });
    },
    [dataMaskSelected, dispatch, setDataMaskSelected],
  );

  useEffect(() => {
    if (previousFilters) {
      const updates = {};
      Object.values(filters).forEach(currentFilter => {
        const currentType = currentFilter.filterType;
        const currentTargets = currentFilter.targets;
        const currentDataMask = currentFilter.defaultDataMask;
        const previousFilter = previousFilters?.[currentFilter.id];
        const previousType = previousFilter?.filterType;
        const previousTargets = previousFilter?.targets;
        const previousDataMask = previousFilter?.defaultDataMask;
        const typeChanged = currentType !== previousType;
        const targetsChanged = !isEqual(currentTargets, previousTargets);
        const dataMaskChanged = !isEqual(currentDataMask, previousDataMask);

        if (typeChanged || targetsChanged || dataMaskChanged) {
          updates[currentFilter.id] = getInitialDataMask(currentFilter.id);
        }
      });

      if (!isEmpty(updates)) {
        setDataMaskSelected(draft => ({ ...draft, ...updates }));
        Object.keys(updates).forEach(key => dispatch(clearDataMask(key)));
      }
    }
  }, [JSON.stringify(filters), JSON.stringify(previousFilters)]);

  const dataMaskAppliedText = JSON.stringify(dataMaskApplied);
  useEffect(() => {
    publishDataMask(history, dashboardId, updateKey, dataMaskApplied, tabId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardId, dataMaskAppliedText, history, updateKey, tabId]);

  const handleApply = useCallback(() => {
    const filterIds = Object.keys(dataMaskSelected);
    setUpdateKey(1);
    filterIds.forEach(filterId => {
      if (dataMaskSelected[filterId]) {
        dispatch(updateDataMask(filterId, dataMaskSelected[filterId]));
      }
    });
  }, [dataMaskSelected, dispatch]);

  const handleClearAll = useCallback(() => {
    const filterIds = Object.keys(dataMaskSelected);
    filterIds.forEach(filterId => {
      if (dataMaskSelected[filterId]) {
        dispatch(clearDataMask(filterId));
        setDataMaskSelected(draft => {
          if (draft[filterId].filterState?.value !== undefined) {
            draft[filterId].filterState!.value = undefined;
          }
        });
      }
    });
  }, [dataMaskSelected, dispatch, setDataMaskSelected]);

  const openFiltersBar = useCallback(
    () => toggleFiltersBar(true),
    [toggleFiltersBar],
  );

  useFilterUpdates(dataMaskSelected, setDataMaskSelected);
  const isApplyDisabled = checkIsApplyDisabled(
    dataMaskSelected,
    dataMaskApplied,
    filterValues,
  );
  const isInitialized = useInitialization();
  const tabPaneStyle = useMemo(
    () => ({ overflow: 'auto', height, overscrollBehavior: 'contain' }),
    [height],
  );

  const numberOfFilters = filterValues.filter(
    filterValue => filterValue.type === NativeFilterType.NATIVE_FILTER,
  ).length;

  return (
    <BarWrapper
      {...getFilterBarTestId()}
      className={cx({ open: filtersOpen })}
      width={width}
    >
      <CollapsedBar
        {...getFilterBarTestId('collapsable')}
        className={cx({ open: !filtersOpen })}
        onClick={openFiltersBar}
        offset={offset}
      >
        <StyledCollapseIcon
          {...getFilterBarTestId('expand-button')}
          iconSize="l"
        />
        <StyledFilterIcon {...getFilterBarTestId('filter-icon')} iconSize="l" />
      </CollapsedBar>
      <Bar className={cx({ open: filtersOpen })} width={width}>
        <Header toggleFiltersBar={toggleFiltersBar} />
        {!isInitialized ? (
          <div css={{ height }}>
            <Loading />
          </div>
        ) : isFeatureEnabled(FeatureFlag.DASHBOARD_NATIVE_FILTERS_SET) ? (
          <StyledTabs
            centered
            onChange={setTab as HandlerFunction}
            defaultActiveKey={TabIds.AllFilters}
            activeKey={editFilterSetId ? TabIds.AllFilters : undefined}
          >
            <Tabs.TabPane
              tab={t('All filters (%(filterCount)d)', {
                filterCount: numberOfFilters,
              })}
              key={TabIds.AllFilters}
              css={tabPaneStyle}
            >
              {editFilterSetId && (
                <EditSection
                  dataMaskSelected={dataMaskSelected}
                  disabled={!isApplyDisabled}
                  onCancel={() => setEditFilterSetId(null)}
                  filterSetId={editFilterSetId}
                />
              )}
              {filterValues.length === 0 ? (
                <FilterBarEmptyStateContainer>
                  <EmptyStateSmall
                    title={t('No filters are currently added')}
                    image="filter.svg"
                    description={
                      canEdit &&
                      t(
                        'Click the button above to add a filter to the dashboard',
                      )
                    }
                  />
                </FilterBarEmptyStateContainer>
              ) : (
                <FilterControls
                  dataMaskSelected={dataMaskSelected}
                  directPathToChild={directPathToChild}
                  onFilterSelectionChange={handleFilterSelectionChange}
                />
              )}
            </Tabs.TabPane>
            <Tabs.TabPane
              disabled={!!editFilterSetId}
              tab={t('Filter sets (%(filterSetCount)d)', {
                filterSetCount: filterSetFilterValues.length,
              })}
              key={TabIds.FilterSets}
              css={tabPaneStyle}
            >
              <FilterSets
                onEditFilterSet={setEditFilterSetId}
                disabled={!isApplyDisabled}
                dataMaskSelected={dataMaskSelected}
                tab={tab}
                onFilterSelectionChange={handleFilterSelectionChange}
              />
            </Tabs.TabPane>
          </StyledTabs>
        ) : (
          <div css={tabPaneStyle}>
            {filterValues.length === 0 ? (
              <FilterBarEmptyStateContainer>
                <EmptyStateSmall
                  title={t('No filters are currently added')}
                  image="filter.svg"
                  description={
                    canEdit &&
                    t('Click the button above to add a filter to the dashboard')
                  }
                />
              </FilterBarEmptyStateContainer>
            ) : (
              <FilterControls
                dataMaskSelected={dataMaskSelected}
                directPathToChild={directPathToChild}
                onFilterSelectionChange={handleFilterSelectionChange}
              />
            )}
          </div>
        )}
        <ActionButtons
          onApply={handleApply}
          onClearAll={handleClearAll}
          dataMaskSelected={dataMaskSelected}
          dataMaskApplied={dataMaskApplied}
          isApplyDisabled={isApplyDisabled}
        />
      </Bar>
    </BarWrapper>
  );
};
export default React.memo(FilterBar);
