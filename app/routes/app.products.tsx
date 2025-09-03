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
  FooterHelp
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { useCallback, useState, useEffect } from "react";

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

export default function Index() {
  const [lastCursor, setLastCursor] = useState("");
  const [products, setProducts] = useState<ProductPreview[]>([]);
  const [moreProducts, setMoreProducts] = useState(false);
  
  const [prevProducts, setPrevProducts] = useState<ProductPreview[][]>([]);
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

  const handleQueryValueChange = useCallback((value: string) => setQueryValue(value), []);

  const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);
  const handleFiltersClearAll = useCallback(() => {
    handleQueryValueRemove();
  }, [
    handleQueryValueRemove,
  ])

  const fetcher = useFetcher();
  const handleMoreProducts = useCallback(() => {
    const sortHandle = sortSelected[0].replace(/ /g, '-');

    fetcher.load(`/api/shopify/product/get/${sortHandle}/${lastCursor}${queryValue ? `?search=${queryValue}` : ""}`);
  },[
    lastCursor
  ]);
  useEffect(() => {
    if (fetcher.data) {
      const replyData = fetcher.data as Reply;

      setMoreProducts(replyData.moreProducts ? replyData.moreProducts : false);
      setLastCursor(replyData.lastCursor ? replyData.lastCursor : lastCursor);
      setProducts(replyData.products ? replyData.products : []);
    }
  },[
    fetcher.data
  ]);

  useEffect(() => {
    const sortHandle = sortSelected[0].replace(/ /g, '-');

    fetcher.load(`/api/shopify/product/get/${sortHandle}/${lastCursor}${queryValue ? `?search=${queryValue}` : ""}`);
  },[
    sortSelected,
    queryValue
  ]);

  const handleNext = useCallback(() => {
    setPrevProducts([...prevProducts, products]);
    handleMoreProducts();
    setPage(page + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setProducts(prevProducts[page - 1])
    setPage(page - 1);
  }, []);

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
            filters={[]}
            appliedFilters={[]}
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