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
  Layout,
  Tabs,
  Card,
  ResourceList,
  ResourceItem,
  Filters,
  ChoiceList,
  FooterHelp,
  TextField,
  Spinner,
  InlineGrid,
  Button,
  ButtonGroup,
  InlineStack,
  Divider
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { useCallback, useState, useEffect } from "react";
import { DeleteIcon, ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons';

interface Reply {
    definitions?: DefinitionPreview[];
    moreDefinitions?: boolean;
    validations?: string[]
}

interface DefinitionPreview {
    id: string;
    name: string;
}

export default function Index() {
    const [currentDefinitionType, setCurrentDefintionType] = useState(0);
    const [typeLoading, setTypeLoading] = useState(true);

    const tabs = [
        {
            id: "artist",
            content: "Artist",
            accessibilityLabel: "Artist",
        },
        {
            id: "assortment",
            content: "Assortment",
            accessibilityLabel: "Assortment",
        },
        {
            id: "brand",
            content: "Brand",
            accessibilityLabel: "Brand",
        },
        {
            id: "category",
            content: "Category",
            accessibilityLabel: "Category",
        },
        {
            id: "occasionNames",
            content: "Occasions",
            accessibilityLabel: "Occasions",
        },
        {
            id: "occasion",
            content: "Occasion Prefix",
            accessibilityLabel: "Occasion Prefix",
        },
        {
            id: "processes",
            content: "Process",
            accessibilityLabel: "Process",
        },
        {
            id: "size",
            content: "Size",
            accessibilityLabel: "Size",
        },
        {
            id: "tone",
            content: "Tones",
            accessibilityLabel: "Tones",
        }
    ]

    const [moreDefinitions, setMoreDefinitions] = useState(false);
    const [queryValue, setQueryValue] = useState("");
    const [definitionList, setDefintionList] = useState<DefinitionPreview[]>([]);
    const [validationList, setValidationList] = useState<string[]>([]);

    const fetcher = useFetcher();

    useEffect(() => {
        setTypeLoading(true);
    }, [currentDefinitionType])

    useEffect(() => {
        fetcher.load(`/api/shopify/${tabs[currentDefinitionType].id}/get${queryValue ? `?search=${queryValue}` : ""}`);
    }, [currentDefinitionType, queryValue]);

    useEffect(() => {
        if (fetcher.data) {
          const replyData = fetcher.data as Reply;
    
          setMoreDefinitions(replyData.moreDefinitions ? replyData.moreDefinitions : false);
          setDefintionList(replyData.definitions ? replyData.definitions : []);
          setValidationList(replyData.validations ? replyData.validations : []);
          setTypeLoading(false);
        }
    },[
        fetcher.data
    ]);

  return (
    <Page 
      fullWidth
      title="Product Definitions"
      backAction={{
        content: "SAP Sync",
        url: "/app"
      }}
    >
      <BlockStack gap="500">
        <Tabs
            tabs={tabs}
            selected={currentDefinitionType}
            onSelect={(newIndex: number) => setCurrentDefintionType(newIndex)}
        />
        {typeLoading ?
            <Spinner accessibilityLabel="Loading Definitions" size="large" />
        :
            <Layout>
                <Layout.Section variant="oneThird">
                    {tabs[currentDefinitionType].id !== "occasionNames" && tabs[currentDefinitionType].id !== "tone" ?
                        <Card padding="0">
                            <BlockStack gap="300">
                                <ResourceList
                                    resourceName={{singular: tabs[currentDefinitionType].content, plural: tabs[currentDefinitionType].content}}
                                    items={definitionList}
                                    filterControl={
                                        <Filters 
                                            filters={[]}
                                            appliedFilters={[]}
                                            onQueryChange={(newValue: string) => setQueryValue(newValue)}
                                            onQueryClear={() => setQueryValue("")}
                                            onClearAll={() => setQueryValue("")}
                                            hideFilters
                                            queryValue={queryValue}
                                        />
                                    }
                                    renderItem={(item, id, index) => { 
                                        return (
                                            <ResourceItem
                                                id={id}
                                                accessibilityLabel={`View details for ${item.name} definition.`}
                                                onClick={() => {}}
                                            >
                                                <Text variant="bodyMd" fontWeight="bold" as="h3">
                                                    {item.name}
                                                </Text>
                                            </ResourceItem>
                                        );
                                    }}
                                />
                                {moreDefinitions ?
                                    <Box borderColor="border" borderWidth="025" borderRadius="150" padding="100">
                                        <Text variant="bodyMd" as="p" alignment="center">There are additional definitions. Please refine with search.</Text>
                                    </Box>
                                : null}
                            </BlockStack>
                        </Card>
                    : null}
                </Layout.Section>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <InlineGrid gap="400" columns={['twoThirds', 'oneThird']} alignItems="center">
                                <Text variant="headingLg" as="h2" key="Heading">
                                    {tabs[currentDefinitionType].id === "occasionNames" || tabs[currentDefinitionType].id === "tone" ? 
                                        tabs[currentDefinitionType].content
                                    :
                                        "TEST" //TODO
                                    }
                                </Text>
                                <InlineStack direction="row-reverse">
                                     <ButtonGroup>
                                        <Button>Cancel</Button>
                                        <Button variant="primary">Save</Button>
                                    </ButtonGroup>
                                </InlineStack>
                            </InlineGrid>
                            <Divider />
                            { validationList.length > 0 ?
                                <>
                                    {validationList.map(validation => (
                                        <InlineGrid gap="200" columns={['twoThirds', 'oneThird']}>
                                            <TextField
                                                label="validation"
                                                labelHidden
                                                value={validation}
                                                onChange={() => {}} //TODO
                                                autoComplete="off"
                                                //Add move up down and delete
                                            />
                                            <InlineGrid gap="200" columns={3}>
                                                <Button icon={ChevronUpIcon} onClick={() => {}}></Button>
                                                <Button icon={ChevronDownIcon} onClick={() => {}}></Button>
                                                <Button variant="primary" tone="critical" icon={DeleteIcon} onClick={() => {}}></Button>
                                            </InlineGrid>
                                        </InlineGrid>
                                    ))}
                                    <Button fullWidth variant="primary" onClick={() => {}} key="AddNewRule">Add New {tabs[currentDefinitionType].content}</Button>
                                </>
                            :
                                null //TODO
                            }
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>
        }
        <FooterHelp>
            For any questions or help please submit a ticket to the HelpDesk.
        </FooterHelp>
      </BlockStack>
    </Page>
  );
}