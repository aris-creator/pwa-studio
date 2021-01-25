import React from 'react';
import createTestInstance from '@magento/peregrine/lib/util/createTestInstance';
import { useStoreSwitcher } from '../useStoreSwitcher';
import { mockSetItem } from '../../../util/simplePersistence';
import { useQuery } from '@apollo/client';

jest.mock('../../../util/simplePersistence');

jest.mock('react-router-dom', () => ({
    useLocation: jest.fn(() => ({ pathname: '' }))
}));

jest.mock('@magento/peregrine', () => ({
    ...jest.requireActual('@magento/peregrine'),
    Util: {
        BrowserPersistence: function() {
            return {
                getItem: jest.fn().mockReturnValueOnce('store2')
            };
        }
    }
}));

jest.mock('@apollo/client', () => {
    const ApolloClient = jest.requireActual('@apollo/client');
    const useQuery = jest.fn();

    return {
        ...ApolloClient,
        useQuery
    };
});

jest.mock('@magento/peregrine/lib/hooks/useDropdown', () => ({
    useDropdown: jest.fn().mockReturnValue({
        elementRef: 'elementRef',
        expanded: false,
        setExpanded: jest.fn(),
        triggerRef: jest.fn()
    })
}));

const defaultProps = {
    queries: {
        getStoreConfigData: 'getStoreConfigData',
        getUrlResolverData: 'getUrlResolverData',
        getAvailableStoresData: 'getAvailableStoresData'
    }
};

const Component = props => {
    const talonProps = useStoreSwitcher(props);

    return <i talonProps={talonProps} />;
};

const getTalonProps = props => {
    const tree = createTestInstance(<Component {...props} />);
    const { root } = tree;
    const { talonProps } = root.findByType('i').props;

    const update = newProps => {
        tree.update(<Component {...{ ...props, ...newProps }} />);

        return root.findByType('i').props.talonProps;
    };

    return { talonProps, tree, update };
};

const storeConfigResponse = {
    code: 'store2',
    store_name: 'Store 2'
};

const categoryPageResponse = {
    id: 1,
    type: 'CATEGORY'
};

const productPageResponse = {
    id: 1,
    type: 'PRODUCT'
};

const availableStoresResponse = [
    {
        code: 'store1',
        locale: 'locale1',
        store_name: 'Store 1',
        default_display_currency_code: 'USD',
        category_url_suffix: null,
        product_url_suffix: null
    },
    {
        code: 'store2',
        locale: 'locale2',
        store_name: 'Store 2',
        default_display_currency_code: 'EUR',
        category_url_suffix: '.html',
        product_url_suffix: '.html'
    },
    {
        code: 'store3',
        locale: 'locale3',
        store_name: 'Store 3',
        default_display_currency_code: 'EUR',
        category_url_suffix: null,
        product_url_suffix: '.htm'
    },
    {
        code: 'store4',
        locale: 'locale4',
        store_name: 'Store 4',
        default_display_currency_code: 'EUR',
        category_url_suffix: '.htm',
        product_url_suffix: null
    },
    {
        code: 'store5',
        locale: 'locale5',
        store_name: 'Store 5',
        default_display_currency_code: 'EUR',
        category_url_suffix: '-abc1',
        product_url_suffix: '.htm.htm'
    },
    {
        code: 'store6',
        locale: 'locale6',
        store_name: 'Store 6',
        default_display_currency_code: 'EUR',
        category_url_suffix: '.some.some',
        product_url_suffix: '-123abc'
    }
];

beforeEach(() => {
    useQuery.mockReset();
    useQuery.mockImplementation(() => {
        return {
            data: {
                storeConfig: storeConfigResponse,
                urlResolver: categoryPageResponse,
                availableStores: availableStoresResponse
            },
            error: null,
            loading: false
        };
    });
});

test('should return correct shape', () => {
    const { talonProps } = getTalonProps(defaultProps);

    expect(talonProps).toMatchSnapshot();
});

describe('event handlers', () => {
    useQuery.mockImplementation(() => {
        return {
            data: {
                storeConfig: storeConfigResponse,
                availableStores: [
                    {
                        code: 'store1',
                        locale: 'locale1',
                        store_name: 'Store 1',
                        default_display_currency_code: 'USD'
                    },
                    {
                        code: 'store2',
                        locale: 'locale2',
                        store_name: 'Store 2',
                        default_display_currency_code: 'EUR'
                    }
                ]
            },
            error: null,
            loading: false
        };
    });
    const { talonProps } = getTalonProps(defaultProps);

    test('handleSwitchStore switches store view', () => {
        const { handleSwitchStore } = talonProps;
        handleSwitchStore('store1');

        expect(mockSetItem.mock.calls).toEqual([
            ['store_view_code', 'store1'],
            ['store_view_currency', 'USD']
        ]);
    });

    test('handleSwitchStore does nothing when switching to not existing store', () => {
        const { handleSwitchStore } = talonProps;
        handleSwitchStore('store404');

        expect(mockSetItem).toHaveBeenCalledTimes(0);
    });
});

describe('handleSwitchStore updates url with configured store code', () => {
    test('includes store code when option is enabled and no store code is present in URL', () => {
        process.env.USE_STORE_CODE_IN_URL = 'true';

        const originalLocation = window.location;
        delete window.location;
        window.location = {
            pathname: '/',
            assign: jest.fn()
        };

        const { talonProps } = getTalonProps(defaultProps);
        const { handleSwitchStore } = talonProps;

        handleSwitchStore('store1');

        expect(window.location.assign).toBeCalledWith('/store1');

        process.env.USE_STORE_CODE_IN_URL = 'false';
        window.location = originalLocation;
    });

    test('replaces current store code in URL with a suffix, with new store code and empty suffix', () => {
        process.env.USE_STORE_CODE_IN_URL = 'true';

        const { talonProps } = getTalonProps(defaultProps);
        const { handleSwitchStore } = talonProps;

        const originalLocation = window.location;
        delete window.location;
        window.location = {
            pathname: '/store2/category-name.html',
            assign: jest.fn()
        };

        handleSwitchStore('store1');

        expect(window.location.assign).toBeCalledWith('/store1/category-name');

        process.env.USE_STORE_CODE_IN_URL = 'false';
        window.location = originalLocation;
    });

    test('adds store code to url when not present but store code in url enabled', () => {
        process.env.USE_STORE_CODE_IN_URL = 'true';

        const { talonProps } = getTalonProps(defaultProps);
        const { handleSwitchStore } = talonProps;

        const originalLocation = window.location;
        delete window.location;
        window.location = {
            pathname: '/category/category-name.html',
            assign: jest.fn()
        };

        handleSwitchStore('store2');

        expect(window.location.assign).toBeCalledWith(
            '/store2/category/category-name.html'
        );

        process.env.USE_STORE_CODE_IN_URL = 'false';
        window.location = originalLocation;
    });

    test('displays correct category url suffix in url, with store code in url enabled', () => {
        process.env.USE_STORE_CODE_IN_URL = 'true';

        const { talonProps } = getTalonProps(defaultProps);
        const { handleSwitchStore } = talonProps;

        const originalLocation = window.location;
        delete window.location;
        window.location = {
            pathname: '/category/category-name.html',
            assign: jest.fn()
        };

        handleSwitchStore('store1');

        // .html => null
        expect(window.location.assign).toBeCalledWith(
            '/store1/category/category-name'
        );

        handleSwitchStore('store4');

        // null => .htm
        expect(window.location.assign).toBeCalledWith(
            '/store4/category/category-name.htm'
        );

        handleSwitchStore('store5');

        // .htm => -abc1
        expect(window.location.assign).toBeCalledWith(
            '/store5/category/category-name-abc1'
        );

        handleSwitchStore('store6');

        // -abc1 => .some.some
        expect(window.location.assign).toBeCalledWith(
            '/store6/category/category-name.some.some'
        );

        handleSwitchStore('store1');

        // .some.some => null
        expect(window.location.assign).toBeCalledWith(
            '/store1/category/category-name'
        );

        process.env.USE_STORE_CODE_IN_URL = 'false';
        window.location = originalLocation;
    });

    test('displays correct product url suffix in url, with store code in url enabled', () => {
        process.env.USE_STORE_CODE_IN_URL = 'true';
        useQuery.mockImplementation(() => {
            return {
                data: {
                    storeConfig: storeConfigResponse,
                    urlResolver: productPageResponse,
                    availableStores: availableStoresResponse
                }
            };
        });

        const { talonProps } = getTalonProps(defaultProps);
        const { handleSwitchStore } = talonProps;

        const originalLocation = window.location;
        delete window.location;
        window.location = {
            pathname: '/product.html',
            assign: jest.fn()
        };

        handleSwitchStore('store1');

        // .html => null
        expect(window.location.assign).toBeCalledWith('/store1/product');

        handleSwitchStore('store3');

        // null => .htm
        expect(window.location.assign).toBeCalledWith('/store3/product.htm');

        handleSwitchStore('store6');

        // .htm => -123abc
        expect(window.location.assign).toBeCalledWith('/store6/product-123abc');

        handleSwitchStore('store5');

        // -123abc => .htm.htm
        expect(window.location.assign).toBeCalledWith(
            '/store5/product.htm.htm'
        );

        handleSwitchStore('store1');

        // .some.some => null
        expect(window.location.assign).toBeCalledWith('/store1/product');

        process.env.USE_STORE_CODE_IN_URL = 'false';
        window.location = originalLocation;
    });
});

describe('handleSwitchStore updates url with store code not configured', () => {
    test('displays correct category url suffix in url, with store code in url disabled', () => {
        process.env.USE_STORE_CODE_IN_URL = 'false';

        const { talonProps } = getTalonProps(defaultProps);
        const { handleSwitchStore } = talonProps;

        const originalLocation = window.location;
        delete window.location;
        window.location = {
            pathname: '/category/category-name.html',
            assign: jest.fn()
        };

        handleSwitchStore('store1');

        // .html => null
        expect(window.location.assign).toBeCalledWith(
            '/category/category-name'
        );

        handleSwitchStore('store4');

        // null => .htm
        expect(window.location.assign).toBeCalledWith(
            '/category/category-name.htm'
        );

        handleSwitchStore('store5');

        // .htm => -abc1
        expect(window.location.assign).toBeCalledWith(
            '/category/category-name-abc1'
        );

        handleSwitchStore('store6');

        // -abc1 => .some.some
        expect(window.location.assign).toBeCalledWith(
            '/category/category-name.some.some'
        );

        handleSwitchStore('store1');

        // .some.some => null
        expect(window.location.assign).toBeCalledWith(
            '/category/category-name'
        );

        window.location = originalLocation;
    });

    test('displays correct product url suffix in url, with store code in url disabled', () => {
        process.env.USE_STORE_CODE_IN_URL = 'false';
        useQuery.mockImplementation(() => {
            return {
                data: {
                    storeConfig: storeConfigResponse,
                    urlResolver: productPageResponse,
                    availableStores: availableStoresResponse
                }
            };
        });

        const { talonProps } = getTalonProps(defaultProps);
        const { handleSwitchStore } = talonProps;

        const originalLocation = window.location;
        delete window.location;
        window.location = {
            pathname: '/product.html',
            assign: jest.fn()
        };

        handleSwitchStore('store1');

        // .html => null
        expect(window.location.assign).toBeCalledWith('/product');

        handleSwitchStore('store3');

        // null => .htm
        expect(window.location.assign).toBeCalledWith('/product.htm');

        handleSwitchStore('store6');

        // .htm => -123abc
        expect(window.location.assign).toBeCalledWith('/product-123abc');

        handleSwitchStore('store5');

        // -123abc => .htm.htm
        expect(window.location.assign).toBeCalledWith('/product.htm.htm');

        handleSwitchStore('store1');

        // .htm.htm => null
        expect(window.location.assign).toBeCalledWith('/product');

        window.location = originalLocation;
    });
});