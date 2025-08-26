import {
  Page,
  IndexTable,
  Text,
  Thumbnail,
  Badge,
  ChoiceList,
  useIndexResourceState,
  Link,
  useBreakpoints,
  IndexFilters,
  useSetIndexFiltersMode,
  IndexFiltersProps,
  TabProps
} from "@shopify/polaris";
import { TitleBar} from "@shopify/app-bridge-react";
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { useLoaderData } from "@remix-run/react";
import { useCallback, useState } from "react";

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

/*export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const brands = new Set();

  const response = await admin.graphql(
    `#graphql
      query getProducts {
        products(first: 250, query: "status:ACTIVE") {
          edges {
            node {
              id
              title
              vendor
              productType
              variants(first: 250) {
                nodes {
                  displayName
                  sku
                  status: metafield(namespace: "custom", key: "status") {
                    value
                  }
                }
              }
              media(first: 1) {
                nodes {
                  preview {
                    image {
                      url
                    }
                  }
                }
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
          }
        }
      }
    `,
    {}
  );

  const result = await response.json();

  const productList: ProductPreview[] = [];

  result.data.products.edges.forEach((product: any) => {
    let b2b = "";
    let d2c = "";

    brands.add(product.node.vendor);
    
    product.node.variants.nodes.forEach((variant: any) => {
      if (variant.displayName.toUpperCase() === "D2C") {
        d2c = variant.status && variant.status.value ? variant.status.value : "";
      } else if (variant.displayName.toUpperCase() === "B2B") {
        b2b = variant.status && variant.status.value ? variant.status.value : "";
      }
    });

    productList.push({
      id: product.node.id,
      title: product.node.title,
      brand: product.node.vendor,
      product: product.node.productType,
      imgUrl: product.node.media.nodes[0].preview.image.url,
      sku: product.node.variants.nodes[0].sku,
      d2cStatus: d2c,
      b2bStatus: b2b
    });
  });

  let moreProducts = result.data.products.pageInfo.hasNextPage;
  let lastCursor = result.data.products.edges[result.data.products.edges.length - 1].cursor;

  while (moreProducts) {
    const additionalResponse = await admin.graphql(
      `#graphql
        query getProducts($cursor: String!) {
          products(first: 250, query: "status:ACTIVE", after: $cursor) {
            edges {
              node {
                id
                title
                vendor
                productType
                variants(first: 250) {
                  nodes {
                    displayName
                    sku
                    status: metafield(namespace: "custom", key: "status") {
                      value
                    }
                  }
                }
                media(first: 1) {
                  nodes {
                    preview {
                      image {
                        url
                      }
                    }
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      `,
      {
        variables: {
          cursor: lastCursor
        }
      }
    );

    const additionalResult = await additionalResponse.json();

    additionalResult.data.products.edges.forEach((product: any) => {
      let b2b = "";
      let d2c = "";

      brands.add(product.node.vendor);
      
      product.node.variants.nodes.forEach((variant: any) => {
        if (variant.displayName.toUpperCase() === "D2C") {
          d2c = variant.status && variant.status.value ? variant.status.value : "";
        } else if (variant.displayName.toUpperCase() === "B2B") {
          b2b = variant.status && variant.status.value ? variant.status.value : "";
        }
      });

      productList.push({
        id: product.node.id,
        title: product.node.title,
        brand: product.node.vendor,
        product: product.node.productType,
        imgUrl: product.node.media.nodes[0].preview.image.url,
        sku: product.node.variants.nodes[0].sku,
        d2cStatus: d2c,
        b2bStatus: b2b
      })
    });

    moreProducts = result.data.products.pageInfo.hasNextPage;
    lastCursor = result.data.products.edges[result.data.products.edges.length - 1].cursor;
  }

  return [productList, brands];
}
*/
export default function Index() {

  /*const [products, brands] = useLoaderData<typeof loader>();

  function isEmpty(value: string | string[]): boolean {
    if (Array.isArray(value)) {
      return value.length === 0;
    } else {
      return value === '' || value == null;
    }
  }

  function disambiguateLabel(key: string, value: string | any[]): string {
    switch (key) {
      case 'brand':
        return `Brand is ${value}`;
      default:
        return value as string;
    }
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const [itemStrings, setItemStrings] = useState(['All']);
  const deleteView = (index: number) => {
    const newItemStrings = [...itemStrings];
    newItemStrings.splice(index, 1);
    setItemStrings(newItemStrings);
    setSelected(0);
  };
  const duplicateView = async (name: string) => {
    setItemStrings([...itemStrings, name]);
    setSelected(itemStrings.length);
    await sleep(1);
    return true;
  };
  const tabs: TabProps[] = itemStrings.map((item, index) => ({
    content: item,
    index,
    onAction: () => {},
    id: `${item}-${index}`,
    isLocked: index === 0,
    actions: index === 0 ? [] : [
      {
        type: 'rename',
        onAction: () => {},
        onPrimaryAction: async (value: string): Promise<boolean> => {
          const newItemStrings = tabs.map((item, idx) => {
            if (idx === index) {
              return value;
            }
            return item.content;
          });
          await sleep(1);
          setItemStrings(newItemStrings);
          return true;
        }
      },
      {
        type: 'duplicate',
        onPrimaryAction: async (value: string): Promise<boolean> => {
          await sleep(1);
          duplicateView(value);
          return true;
        }
      },
      {
        type: 'edit'
      },
      {
        type: 'delete',
        onPrimaryAction: async () => {
          await sleep(1);
          deleteView(index);
          return true;
        }
      }
    ]
  }));
  const [selected, setSelected] = useState(0);
  const onCreateNewView = async (value: string) => {
    await sleep(500);
    setItemStrings([...itemStrings, value]);
    setSortSelected(itemStrings.length);
    return true;
  };
  const sortOptions: IndexFiltersProps['sortOptions']= [
    {label: 'Created', value: 'date asc', directionLabel: 'Ascending'},
    {label: 'Created', value: 'date desc', directionLabel: 'Descending'},
  ];
  const [sortSelected, setSortSelected] = useState(['order asc'])
  const {mode, setMode} = useSetIndexFiltersMode();
  const onHandleCancel = () => {};

  const onHandleSave = async () => {
    await sleep(1);
    return true;
  };

  const primaryAction: IndexFiltersProps['primaryAction'] = selected === 0 ? {
    type: 'save-as',
    onAction: onCreateNewView,
    disabled: false,
    loading: false
  } : {
    type: 'save',
    onAction: onHandleSave,
    disabled: false,
    loading: false
  };

  const [queryValue, setQueryValue] = useState('');
  const [brand, setBrand] = useState('');
  
  const handleBrandChange = useCallback((value: string) => setBrand(value), []);
  const handleFiltersQueryChange = useCallback((value: string) => setQueryValue(value), []);
  const handleBrandRemove = useCallback(() => setBrand(''), []);
  const handleQueryValueRemove = useCallback(() => setQueryValue(''), []);
  const handleFiltersClearAll = useCallback(() => {
    handleBrandRemove();
  }, [
    handleBrandRemove
  ]);

  const filters = [
    {
      key: 'brand',
      label: "Brand",
      filter: (
        <ChoiceList 
          title="Brand"
          titleHidden
          choices={[...brands].map((brand: string) => ({
            label: brand,
            value: brand
          }))}
          selected={brand || []}
          onChange={handleBrandChange}
          allowMultiple
        />
      ),
      shortcut: true
    }
  ]

  const appliedFilters: IndexFiltersProps['appliedFilters'] = [];
  if (!isEmpty(brand)) {
    const key = 'brand';
    appliedFilters.push({
      key,
      label: disambiguateLabel(key, brand),
      onRemove: handleBrandRemove
    });
  }

  const { selectedResources, allResourcesSelected, handleSelectionChange } = useIndexResourceState(products);

  const rowMarkup = products.map(({imgUrl, sku, title, brand, product, d2cStatus, b2bStatus, id}: ProductPreview, index: number) => (
    <IndexTable.Row
      id={id}
      key={id}
      selected={selectedResources.includes(id)}
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
      <IndexTable.Cell>{ title }</IndexTable.Cell>
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
  */
  return (
    <Page fullWidth>
      <TitleBar title="Product Feed" />
      Test
      {/*<IndexFilters 
        sortOptions={sortOptions}
        sortSelected={sortSelected}
        queryValue={queryValue}
        queryPlaceholder="Searching products"
        onQueryChange={handleFiltersQueryChange}
        onQueryClear={() => setQueryValue('')}
        onSort={setSortSelected}
        primaryAction={primaryAction}
        cancelAction={{
          onAction: onHandleCancel,
          disabled: false,
          loading: false
        }}
        tabs={tabs}
        selected={selected}
        onSelect={setSelected}
        canCreateNewView
        onCreateNewView={onCreateNewView}
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
        selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
        onSelectionChange={handleSelectionChange}
        headings={[
          {title: ""},
          {title: "SKU"},
          {title: "Title"},
          {title: "Brand"},
          {title: "Product"},
          {title: "D2C"},
          {title: "B2B"},
        ]}
      >
        {rowMarkup}
      </IndexTable>*/}
    </Page>
  );
}