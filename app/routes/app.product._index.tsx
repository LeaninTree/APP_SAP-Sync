import {
  Page,
  IndexTable,
  Text,
  Thumbnail,
  Badge,
  useIndexResourceState,
  Link,
  useBreakpoints,
  EmptySearchResult,
  IndexFilters,
  useSetIndexFiltersMode,
  IndexFiltersProps,
  TabProps,
  Spinner
} from "@shopify/polaris";
import { TitleBar} from "@shopify/app-bridge-react";
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { useFetcher, useLoaderData } from "@remix-run/react";
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

interface LoaderData {
  products: ProductPreview[];
  lastCursor: String;
  moreProducts: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const brands = new Set();

  const response = await admin.graphql(
    `#graphql
      query getProducts {
        products(first: 50, query: "status:ACTIVE") {
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

  const products = productList;

  return {products, brands, lastCursor, moreProducts};
}

export default function Index() {

  const {brands} = useLoaderData<typeof loader>();
  let {products, lastCursor, moreProducts} = useLoaderData() as LoaderData;
  
  const [prevProducts, setPrevProducts] = useState<ProductPreview[][]>([]);
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(false);
  }, [products])

  const emptyStateMarkup = (
    <EmptySearchResult
      title={'No products yet'}
      description={'Try changing the filters or search term'}
      withIllustration
    />
  );

  const fetcher = useFetcher();
  const handleMoreProducts = useCallback(() => {
    fetcher.load(`/app/product/get/${lastCursor}`);
  },[
    lastCursor
  ]);
  useEffect(() => {
    if (fetcher.data) {
      console.log(fetcher.data);
      //update products
    }
  },[
    fetcher.data
  ]);

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

  return (
    <Page fullWidth>
      <TitleBar title="Product Feed" />
      {loading ?
        <Spinner accessibilityLabel="Loading" size="large" />
      :
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
            onNext: () => {
              setLoading(true);
              setPrevProducts([...prevProducts, products]);
              handleMoreProducts();
              setPage(page + 1);

            },
            onPrevious: () => {
              setLoading(true);
              products = prevProducts[page - 1];
              setPage(page - 1);
            }
          }}
        >
          {rowMarkup}
        </IndexTable>
      }
    </Page>
  );
}