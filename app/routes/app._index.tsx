import {
  Page,
  Card,
  Layout,
  Text,
  FooterHelp,
  BlockStack,
  InlineStack,
  Badge,
  InlineGrid,
  Button,
  Collapsible,
  Divider,
  Box
} from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
    
  const response = await admin.graphql(
    `#graphql
      query GetProductFeedStatus {
        metaobjects(type: "sap_feed", first: 250, sortKey: "updated_at") {
          pageInfo {
            hasNextPage
          }
          nodes {
            updatedAt
          }
        }
      }
    `,
    {

    }
  );

  const result = await response.json()

  const latestUpdate: string = result.data.metaobjects.nodes[0].updatedAt;
  const oldestUpdate: string = result.data.metaobjects.nodes[result.data.metaobjects.nodes.length - 1].updatedAt;
  const updateCount: number = result.data.metaobjects.nodes.length;

  const productFeed = {latestUpdate, oldestUpdate, updateCount};

  const definitions: {[key: string]: {name: string, badge?: string, list?: string[]}} = {
    artist: {
      name: "Artists"
    },
    assortment: {
      name: "Assortments"
    },
    brand: {
      name: "Brands"
    },
    category: {
      name: "Categories"
    },
    occasion: {
      name: "Occasion Prefixes"
    },
    process: {
      name: "Processes"
    },
    size: {
      name: "Sizes"
    }
  }

  for (const key in definitions) {
    const response = await admin.graphql(
      `#graphql
        query GetUndefinedMetaobjects($type: String!) {
          metaobjects(type: $type, first: 25, query: "NOT fields.definition:true") {
            pageInfo {
              hasNextPage
            }
            nodes {
              displayName
            }
          }
        }
      `,
      {
        variables: {
          type: key
        }
      }
    );

    const result = await response.json();

    definitions[key] = {
      name: definitions[key].name,
      badge: result.data.metaobjects.nodes.length > 0 ? result.data.metaobjects.pageInfo.hasNextPage ? "Attention: 25+" : `Attention: ${result.data.metaobjects.nodes.length}` : "No Warnings",
      list: result.data.metaobjects.nodes.map((item: any) => item.displayName)
    };
  }

  return {productFeed: productFeed, definitions: definitions}
}

export default function Index() {
  const {productFeed, definitions} = useLoaderData<typeof loader>();

  const [definitionOpen, setDefinitionOpen] = useState(false);

  const productFeedOldestUpdateTimestamp = new Date(productFeed.oldestUpdate);
  const productFeedLatestUpdateTimestamp = new Date(productFeed.latestUpdate);

  const now = new Date();
  const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000; // days * hours * minutes * seconds * milliseconds
  const oneWeekAgoTimestamp = now.getTime() - oneWeekInMilliseconds;

  return (
    <Page fullWidth>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineGrid columns={["twoThirds", "oneThird"]}>
                <Text variant="headingLg" as="h3">Definitions</Text>
                <InlineStack direction="row-reverse">
                  <Button
                  onClick={() => setDefinitionOpen(!definitionOpen)}
                  ariaExpanded={definitionOpen}
                  ariaControls="definition-collapsible"
                  >
                    { definitionOpen ? "Collapse" : "Expand" }
                  </Button>
                </InlineStack>
              </InlineGrid>
              <InlineGrid columns={Object.keys(definitions).length}>
                {Object.keys(definitions).map(key => (
                  <BlockStack gap="200" inlineAlign="center">
                    <Text variant="bodyLg" as="p"><b>{ definitions[key]?.name }</b></Text>
                    <Badge tone={definitions[key]?.badge === "No Warnings" ? "success" : "warning"}>{ definitions[key]?.badge }</Badge>
                  </BlockStack>
                ))}
              </InlineGrid>
              <Collapsible
                open={definitionOpen}
                transition={{duration: '500ms', timingFunction: 'ease-in-out'}}
                expandOnPrint
                id="definition-collapsible"
              >
                <Divider />
                <InlineGrid columns={Object.keys(definitions).length}>
                  {Object.keys(definitions).map(key => (
                    <BlockStack gap="200" inlineAlign="center">
                      {definitions[key].list?.map(item => (
                        <Text variant="bodyMd" as="p">{ item }</Text>
                      ))}
                      {definitions[key].list && definitions[key].list.length > 25 ? 
                        <Text variant="bodySm" as="p">...</Text>
                      : null}
                    </BlockStack>
                  ))}
                </InlineGrid>
              </Collapsible>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section variant="oneThird">
          <BlockStack gap="500">
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="300">
                  <Text variant="headingLg" as="h3">Product Feed Status</Text>
                  <Badge 
                    tone={productFeed.updateCount === 0 ? "success" : (productFeedOldestUpdateTimestamp.getTime() < oneWeekAgoTimestamp) ? "critical" : "attention"}
                    progress={productFeed.updateCount === 0 ? "complete" : (productFeedOldestUpdateTimestamp.getTime() < oneWeekAgoTimestamp) ? "incomplete" : "partiallyComplete"}
                  >
                    {productFeed.updateCount === 0 ? "No Action" : (productFeedOldestUpdateTimestamp.getTime() < oneWeekAgoTimestamp) ? "Potential Error" : "In Progress"}
                  </Badge>
                </InlineStack>
                {productFeed.updateCount > 0 ?
                  <>
                    <Text variant="bodyLg" as="p"><b>Files pending processing:</b> {productFeed.updateCount}</Text>
                    <Text variant="bodyLg" as="p"><b>Most Recent File Upload:</b> {productFeedLatestUpdateTimestamp.toLocaleString()}</Text>
                    {productFeedOldestUpdateTimestamp.getTime() < oneWeekAgoTimestamp ?
                      <Text variant="bodyLg" as="p">Oldest Unprocessed File: {productFeedOldestUpdateTimestamp.toLocaleString()}</Text>
                    : null}
                  </>
                : null}
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="300">
                  <Text variant="headingLg" as="h3">Order Feed Status</Text>
                  <Badge>Coming Soon</Badge>
                </InlineStack>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="300">
                  <Text variant="headingLg" as="h3">Fufillment Feed Status</Text>
                  <Badge>Coming Soon</Badge>
                </InlineStack>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <InlineStack gap="300">
                  <Text variant="headingLg" as="h3">Customer Feed Status</Text>
                  <Badge>Coming Soon</Badge>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
      <FooterHelp>
         For any questions or help please submit a ticket to the HelpDesk.
      </FooterHelp>
    </Page>
  );
}
