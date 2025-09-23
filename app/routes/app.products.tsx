import {
  Page,
  IndexTable,
  Text,
  Thumbnail,
  Badge,
  Link,
  useBreakpoints,
  EmptySearchResult,
  IndexFilters,
  useSetIndexFiltersMode,
  IndexFiltersProps,
  BlockStack,
  IndexFiltersMode,
  Box,
  FooterHelp,
  TextField
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { useCallback, useState, useEffect } from "react";
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

interface ProductPreview {
  id: string;
  title: string;
  imgUrl: string;
  sku: string;
  brand: string;
  product: string;
  d2cStatus: "DRAFT" | "ACTIVE" | "ARCHIVED" | string;
  b2bStatus: "DRAFT" | "ACTIVE" | "ARCHIVED" | string;
}

interface Reply {
    products?: any[];
    moreProducts?: boolean;
    lastCursor?: string;
}

export async function loader({request}: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const typeResponse = await admin.graphql(
    `#graphql
      query GetTypeOptions($type: String!) {
        metaobjects(type: $type, first: 250) {
          nodes {
            displayName
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    {
      variables: {
        type: "product_type"
      }
    }
  );

}

export default function Index() {
  const [lastCursor, setLastCursor] = useState("");
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [moreProducts, setMoreProducts] = useState(false);
  
  const [lastCursors, setLastCursors] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const emptyStateMarkup = (
    <EmptySearchResult
      title={'No products yet'}
      description={'Try changing the filters or search term'}
      withIllustration
    />
  );

  const [selected, setSelected] = useState(0);

  const sortOptions: IndexFiltersProps['sortOptions'] = [
    {label: 'Title', value: 'title asc', directionLabel: 'Ascending'},
    {label: 'Title', value: 'title desc', directionLabel: 'Descending'},
    {label: 'Brand', value: 'vendor asc', directionLabel: 'Ascending'},
    {label: 'Brand', value: 'vendor desc', directionLabel: 'Descending'},
    {label: 'Product Type', value: 'product_type asc', directionLabel: 'Ascending'},
    {label: 'Product Type', value: 'product_type desc', directionLabel: 'Descending'},
    {label: 'Created', value: 'created_at asc', directionLabel: 'Ascending'},
    {label: 'Created', value: 'created_at desc', directionLabel: 'Descending'},
    {label: 'Updated', value: 'updated_at asc', directionLabel: 'Ascending'},
    {label: 'Updated', value: 'updated_at desc', directionLabel: 'Descending'},
  ];
  const [sortSelected, setSortSelected] = useState(['title asc']);
  const {mode, setMode} = useSetIndexFiltersMode(IndexFiltersMode.Filtering);
  
  const [queryValue, setQueryValue] = useState<string | undefined>(undefined);
  const [brandFilter, setBrandFilter] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('');

  const handleQueryValueChange = useCallback((value: string) => setQueryValue(value), []);
  const handleBrandFilterChange = useCallback((value: string) => setBrandFilter(value), []);
  const handleProductTypeFilterChange = useCallback((value: string) => setProductTypeFilter(value), []);

  const handleQueryValueRemove = useCallback(() => {
    setQueryValue('');
  }, []);

  const handleFiltersClearAll = useCallback(() => {
    handleQueryValueRemove();
    setBrandFilter('');
    setProductTypeFilter('');
  }, [
    handleQueryValueRemove,
  ]);
  
  const fetcher = useFetcher();

  const fetchProducts = useCallback((cursor?: string) => {
    const sortHandle = sortSelected[0].replace(/ /g, '-');
    const searchParams = new URLSearchParams();
    if (queryValue) searchParams.append('search', queryValue);
    if (brandFilter) searchParams.append('brand', brandFilter);
    if (productTypeFilter) searchParams.append('product_type', productTypeFilter);
    
    const queryString = searchParams.toString();
    const cursorPath = cursor ? `/${cursor}` : "";

    fetcher.load(`/api/shopify/product/get/${sortHandle}${cursorPath}${queryString ? `?${queryString}` : ""}`);
  }, [sortSelected, queryValue, brandFilter, productTypeFilter, fetcher]);

  useEffect(() => {
    if (fetcher.data) {
      const replyData = fetcher.data as Reply;

      setMoreProducts(replyData.moreProducts ?? false);
      setLastCursor(replyData.lastCursor ?? "");
      setProducts(replyData.products ?? []);
    }
  }, [fetcher.data]);

  useEffect(() => {
    setPage(0);
    setLastCursors([]);
    fetchProducts();
  }, [sortSelected, queryValue, brandFilter, productTypeFilter]);

  const handleNext = useCallback(() => {
    if (lastCursor) {
      setLastCursors(prev => [...prev, lastCursor]);
      setPage(prev => prev + 1);
      fetchProducts(lastCursor);
    }
  }, [lastCursor, fetchProducts]);

  const handlePrev = useCallback(() => {
    if (page > 0) {
      const newPage = page - 1;
      const newCursor = lastCursors[newPage - 1] ?? "";
      setLastCursors(prev => prev.slice(0, newPage));
      setPage(newPage);
      fetchProducts(newCursor);
    }
  }, [page, lastCursors, fetchProducts]);

  const filters = [
    {
      key: 'brand',
      label: 'Brand',
      filter: (
        <TextField
          label="Brand"
          value={brandFilter}
          onChange={handleBrandFilterChange}
          labelHidden
          autoComplete="off"
        />
      ),
      shortcut: true,
    },
    {
      key: 'productType',
      label: 'Product Type',
      filter: (
        <TextField
          label="Product Type"
          value={productTypeFilter}
          onChange={handleProductTypeFilterChange}
          labelHidden
          autoComplete="off"
        />
      ),
      shortcut: true,
    }
  ];

  const rowMarkup = products.map(({imgUrl, sku, title, brand, product, d2cStatus, b2bStatus, id}: ProductPreview, index: number) => (
    <IndexTable.Row
      id={id}
      key={id}
      position={index}
    >
      <IndexTable.Cell>
        <Thumbnail
          source={imgUrl}
          alt=""
        />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Link
          dataPrimaryLink
          url={`/app/product/${id.split("/").pop()}`}
        >
          <Text variant="bodyMd" fontWeight="bold" as="span">
            { sku }
          </Text>
        </Link>
      </IndexTable.Cell>
      <IndexTable.Cell>{ title.length > 63 ? title.slice(0, 60) + '...' : title }</IndexTable.Cell>
      <IndexTable.Cell>{ brand }</IndexTable.Cell>
      <IndexTable.Cell>{ product }</IndexTable.Cell>
      <IndexTable.Cell>
        {d2cStatus === "ACTIVE" ?
          <Badge progress="complete" tone="success">Active</Badge>
        :
          d2cStatus === "DRAFT" ?
            <Badge progress="incomplete" tone="info">Pre-Launch</Badge>
          :
            <Badge progress="partiallyComplete" tone="warning">Not Avaliable</Badge>
        }
      </IndexTable.Cell>
      <IndexTable.Cell>
        {b2bStatus === "ACTIVE" ?
          <Badge progress="complete" tone="success">Active</Badge>
        :
          b2bStatus === "DRAFT" ?
            <Badge progress="incomplete" tone="info">Pre-Launch</Badge>
          :
            <Badge progress="partiallyComplete" tone="warning">Not Avaliable</Badge>
        }
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  const appliedFilters = [
    ...(brandFilter ? [{
      key: 'brand',
      label: `Brand: ${brandFilter}`,
      onRemove: () => setBrandFilter(''),
    }] : []),
    ...(productTypeFilter ? [{
      key: 'productType',
      label: `Product Type: ${productTypeFilter}`,
      onRemove: () => setProductTypeFilter(''),
    }] : [])
  ];

  return (
    <Page 
      fullWidth
      title="Product Feed"
      subtitle={`Showing ${products.length} product${products.length !== 1 ? "s" : ""}`}
      backAction={{
        content: "SAP Sync",
        url: "/app"
      }}
    >
      <BlockStack gap="500">
        <Box>
          <IndexFilters
            sortOptions={sortOptions}
            sortSelected={sortSelected}
            queryValue={queryValue}
            queryPlaceholder="Searching products"
            onQueryChange={handleQueryValueChange}
            onQueryClear={() => setQueryValue('')}
            onSort={setSortSelected}
            tabs={[]}
            selected={selected}
            onSelect={setSelected}
            filters={filters}
            appliedFilters={appliedFilters}
            onClearAll={handleFiltersClearAll}
            mode={mode}
            setMode={setMode}
          />
          <IndexTable
            condensed={useBreakpoints().smDown}
            resourceName={{singular: "product", plural: "products"}}
            itemCount={products.length}
            emptyState={emptyStateMarkup}
            selectable={false}
            headings={[
              {title: ""},
              {title: "SKU"},
              {title: "Title"},
              {title: "Brand"},
              {title: "Product"},
              {title: "D2C"},
              {title: "B2B"},
            ]}
            pagination={{
              hasNext: moreProducts,
              hasPrevious: !(page === 0),
              onNext: handleNext,
              onPrevious: handlePrev
            }}
          >
            { rowMarkup }
          </IndexTable>
        </Box>
        <FooterHelp>
            For any questions or help please submit a ticket to the HelpDesk.
        </FooterHelp>
      </BlockStack>
    </Page>
  );
}
