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

  const latestUpdate: string = result.data.metaobjects.nodes.length > 0 ? result.data.metaobjects.nodes[0].updatedAt : "";
  const oldestUpdate: string = result.data.metaobjects.nodes.length > 0 ? result.data.metaobjects.nodes[result.data.metaobjects.nodes.length - 1].updatedAt : "";
  const updateCount: number = result.data.metaobjects.nodes.length;

  const productFeed = {latestUpdate, oldestUpdate, updateCount};

  const definitions: {[key: string]: {name: string, badge?: string, list?: string[]}} = {
    artist: {
      name: "Artists"
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
    processes: {
      name: "Processes"
    },
  }

  for (const key in definitions) {
    const response = await admin.graphql(
      `#graphql
        query GetUndefinedMetaobjects($type: String!) {
          metaobjects(type: $type, first: 25, query: "fields.definition:false") {
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

  const aiResponse = await admin.graphql(
    `#graphql
      query GetAIQueue {
        shop {
          queue: metafield(namespace: "custom", key: "ai_queue") {
            value
            updatedAt
          }
          counter: metafield(namespace: "custom", key: "daily_ai_counter") {
            value
          }
          backlog: metafield(namespace: "custom", key: "ai_backlog") {
            value
            updatedAt
          }
        }
      }
    `,
    {

    }
  );

  const aiResult = await aiResponse.json();

  let ai: {
    queue: string[]; 
    updatedAt: Date | null; 
    counter: number | null;
    backlog: string[];
    backlogUpdatedAt: Date | null;
  } ={
    queue: [],
    updatedAt: null,
    counter: null,
    backlog: [],
    backlogUpdatedAt: null,
  };
  if (aiResult.data.shop.queue) {
    ai.queue = JSON.parse(aiResult.data.shop.queue.value);
    ai.updatedAt = new Date(aiResult.data.shop.queue.updatedAt);
  }
  if (aiResult.data.shop.counter) {
    ai.counter = Number(aiResult.data.shop.counter.value);
  }
  if (aiResult.data.shop.backlog) {
    ai.backlog = JSON.parse(aiResult.data.shop.backlog.value);
    ai.backlogUpdatedAt = new Date(aiResult.data.shop.backlog.updatedAt);
  }

  return {productFeed: productFeed, definitions: definitions, aiQueue: ai}
}

export default function Index() {
  const {productFeed, definitions, aiQueue} = useLoaderData<typeof loader>();

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
          <Card key="1-1">
            <BlockStack gap="300">
              <InlineGrid columns={["twoThirds", "oneThird"]} key="1-1-1">
                <Text variant="headingLg" as="h3" key="1-1-1-1">Definitions</Text>
                <InlineStack direction="row-reverse" key="1-1-1-2">
                  <Button
                  onClick={() => setDefinitionOpen(!definitionOpen)}
                  ariaExpanded={definitionOpen}
                  ariaControls="definition-collapsible"
                  key="1-1-1-2-1"
                  >
                    { definitionOpen ? "Collapse" : "Expand" }
                  </Button>
                </InlineStack>
              </InlineGrid>
              <InlineGrid columns={Object.keys(definitions).length} key="1-1-2">
                {Object.keys(definitions).map((key, i) => (
                  <BlockStack gap="200" inlineAlign="center" key={`1-1-2-${i}`}>
                    <Text variant="bodyLg" as="p" key={`1-1-2-${i}-1`}><b>{ definitions[key]?.name }</b></Text>
                    <Badge tone={definitions[key]?.badge === "No Warnings" ? "success" : "warning"} key={`1-1-2-${i}-2`}>{ definitions[key]?.badge }</Badge>
                  </BlockStack>
                ))}
              </InlineGrid>
              <Collapsible
                open={definitionOpen}
                transition={{duration: '500ms', timingFunction: 'ease-in-out'}}
                expandOnPrint
                id="definition-collapsible"
                key="1-1-3"
              >
                <Divider key="1-1-3-1" />
                <InlineGrid columns={Object.keys(definitions).length} key="1-1-3-2">
                  {Object.keys(definitions).map((key, i) => (
                    <BlockStack gap="200" inlineAlign="center" key={`1-1-3-2-${i}`}>
                      {definitions[key].list?.map((item, j) => (
                        <Text variant="bodyMd" as="p" key={`1-1-3-2-${i}-${j}`}>{ item }</Text>
                      ))}
                      {definitions[key].list && definitions[key].list.length > 25 ? 
                        <Text variant="bodySm" as="p" key={`1-1-3-2-${i}-x`}>...</Text>
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
            <Card key="2-1">
              <BlockStack gap="300">
                <InlineStack gap="300" key="2-1-1">
                  <Text variant="headingLg" as="h3" key="2-1-1-1">Product Feed Status</Text>
                  <Badge 
                    tone={productFeed.updateCount === 0 ? "success" : (productFeedOldestUpdateTimestamp.getTime() < oneWeekAgoTimestamp) ? "critical" : "attention"}
                    progress={productFeed.updateCount === 0 ? "complete" : (productFeedOldestUpdateTimestamp.getTime() < oneWeekAgoTimestamp) ? "incomplete" : "partiallyComplete"}
                    key="2-1-1-2"
                  >
                    {productFeed.updateCount === 0 ? "Standby" : (productFeedOldestUpdateTimestamp.getTime() < oneWeekAgoTimestamp) ? "Unprocessed File" : "In Progress"}
                  </Badge>
                </InlineStack>
                {productFeed.updateCount > 0 ?
                  <>
                    <Text variant="bodyLg" as="p" key="2-1-2"><b>Files pending processing:</b> {productFeed.updateCount}</Text>
                    <Text variant="bodyLg" as="p" key="2-1-3"><b>Most Recent File Upload:</b> {productFeedLatestUpdateTimestamp.toLocaleString()}</Text>
                    {productFeedOldestUpdateTimestamp.getTime() < oneWeekAgoTimestamp ?
                      <Text variant="bodyLg" as="p" key="2-1-4"><b>Oldest Unprocessed File:</b> {productFeedOldestUpdateTimestamp.toLocaleString()}</Text>
                    : null}
                  </>
                : null}
              </BlockStack>
            </Card>
            <Card key="2-2">
              <BlockStack gap="300">
                <InlineStack gap="300" key="2-2-1">
                  <Text variant="headingLg" as="h3" key="2-2-1-1">AI Analysis Status</Text>
                  <Badge
                    tone={aiQueue.queue.length === 0 ? "success" : aiQueue.counter && aiQueue.counter < 245 ? "attention" : "critical"}
                    progress={aiQueue.queue.length === 0 ? "complete" : aiQueue.counter && aiQueue.counter < 245 ? "partiallyComplete" : "incomplete"}
                    key="2-2-1-2"
                  >
                    {aiQueue.queue.length === 0 ? "Standby" : aiQueue.counter && aiQueue.counter < 245 ? "In Progress" : "API Limit Hit"}
                  </Badge>
                </InlineStack>
                {aiQueue.queue.length > 0 ?
                  <>
                    <Text variant="bodyLg" as="p" key="2-2-2"><b>Products pending processing:</b> {aiQueue.queue.length}</Text>
                    {aiQueue.updatedAt ? 
                      <Text variant="bodyLg" as="p" key="2-2-3"><b>Most Recent Queue Update:</b> {aiQueue.updatedAt.toLocaleString()}</Text>
                    : null}
                  </>
                : null}
                {aiQueue.backlog.length > 0 ?
                  <>
                    <Text variant="bodyLg" as="p" key="2-2-2"><b>Backlogged Products pending processing:</b> {aiQueue.backlog.length}</Text>
                    {aiQueue.backlogUpdatedAt ? 
                      <Text variant="bodyLg" as="p" key="2-2-3"><b>Most Recent Backlog Update:</b> {aiQueue.backlogUpdatedAt.toLocaleString()}</Text>
                    : null}
                  </>
                : null}
              </BlockStack>
            </Card>
            <Card key="2-3">
              <BlockStack gap="300">
                <InlineStack gap="300" key="2-3-1">
                  <Text variant="headingLg" as="h3" key="2-3-1-1">Order Feed Status</Text>
                  <Badge key="2-3-1-2">Coming Soon</Badge>
                </InlineStack>
              </BlockStack>
            </Card>
            <Card key="2-4">
              <BlockStack gap="300">
                <InlineStack gap="300" key="2-4-1">
                  <Text variant="headingLg" as="h3" key="2-4-1-1">Fufillment Feed Status</Text>
                  <Badge key="2-4-1-2">Coming Soon</Badge>
                </InlineStack>
              </BlockStack>
            </Card>
            <Card key="2-5">
              <BlockStack gap="300">
                <InlineStack gap="300" key="2-5-1">
                  <Text variant="headingLg" as="h3" key="2-5-1-1">Customer Feed Status</Text>
                  <Badge key="2-5-1-2">Coming Soon</Badge>
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
