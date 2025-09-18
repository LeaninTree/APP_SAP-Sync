import {
  Page,
  Card,
  Text,
  Badge,
  BlockStack,
  Box,
  Layout,
  Button,
  Collapsible,
  InlineGrid,
  TextField,
  Select,
  ResourceList,
  ResourceItem,
  InlineStack,
  FooterHelp,
  Checkbox
} from "@shopify/polaris";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import { EditIcon, DeleteIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from '@shopify/polaris-icons';
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export interface Rule {
    title: string;
    type: boolean;
    variant: string;
    brand: string;
    product: string;
    occasion: string;
    assortment: string;
    customization: string;
    edit: boolean;
    handle: string;
    id?: string;
}

export interface Channel {
    title: string;
    location: string;
    external: string;
    rules: Rule[];
    handle: string;
}

export async function loader({request}: LoaderFunctionArgs) {
    
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(
        `#graphql
            query {
                metaobjectDefinitionByType(type: "sales_channels") {
                    metaobjects(first: 250) {
                        nodes {
                            handle,
                            title: field(key: "title") {
                                value
                            },
                            location: field(key: "location") {
                                value
                            },
                            external: field(key: "external") {
                                value
                            },
                            rules: field(key: "rules") {
                                value
                            },
                        }
                    }
                }
            }
        `,
        {

        }
    );

    const result = await response.json();

    const channels: Channel[] = [];

    for (let i = 0; i < result.data.metaobjectDefinitionByType.metaobjects.nodes.length; i++) {
        const rules: Rule[] = [];

        if (result.data.metaobjectDefinitionByType.metaobjects.nodes[i].rules && result.data.metaobjectDefinitionByType.metaobjects.nodes[i].rules.value) {
            const ruleIds = JSON.parse(result.data.metaobjectDefinitionByType.metaobjects.nodes[i].rules.value);

            for (let k = 0; k < ruleIds.length; k++) {
                const ruleResponse = await admin.graphql(
                    `#graphql
                        query Rule($id: ID!) {
                            metaobject(id: $id) {
                                id,
                                handle,
                                title: field(key: "title") {
                                    value
                                },
                                type: field(key: "type") {
                                    value
                                },
                                variant: field(key: "variant") {
                                    value
                                },
                                brand: field(key: "brand") {
                                    value
                                },
                                product: field(key: "product") {
                                    value
                                },
                                occasion: field(key: "occasion") {
                                    value
                                },
                                assortment: field(key: "assortment") {
                                    value
                                },
                                customization: field(key: "customization") {
                                    value
                                }
                            }
                        }
                    `,
                    {
                        variables: {
                            id: ruleIds[k]
                        }
                    }
                );

                const ruleResult = await ruleResponse.json();

                rules.push({
                    title: ruleResult.data.metaobject.title.value,
                    type: ruleResult.data.metaobject.type.value === "true" ? true : false,
                    variant: ruleResult.data.metaobject.variant.value,
                    brand: ruleResult.data.metaobject.brand.value,
                    product: ruleResult.data.metaobject.product.value,
                    occasion: ruleResult.data.metaobject.occasion.value,
                    assortment: ruleResult.data.metaobject.assortment.value,
                    customization: ruleResult.data.metaobject.customization.value,
                    edit: false,
                    handle: ruleResult.data.metaobject.handle,
                    id: ruleResult.data.metaobject.id
                });
            }
        }

        channels.push({
            title: result.data.metaobjectDefinitionByType.metaobjects.nodes[i].title.value,
            location: result.data.metaobjectDefinitionByType.metaobjects.nodes[i].location.value,
            external: result.data.metaobjectDefinitionByType.metaobjects.nodes[i].external.value,
            handle: result.data.metaobjectDefinitionByType.metaobjects.nodes[i].handle,
            rules: rules
        });
    }

    const brandResponse = await admin.graphql(
        `#graphql
            query BrandDefinitions($type: String!) {
                metaobjectDefinitionByType(type: $type) {
                    metaobjects(first: 250) {
                        nodes {
                            handle
                            name: field(key: "name") {
                                value
                            }
                            defined: field(key: "definition") {
                                value
                            }
                        }
                    }
                }
            }
        `,
        {
            variables: {
                type: "brand"
            }
        }
    );
    const brandResult = await brandResponse.json();
    const brandOptions = brandResult.data.metaobjectDefinitionByType.metaobjects.nodes.filter((metaobject: any) => metaobject.defined.value === "true").map((metaobject: any) => ({
        label: metaobject.name.value,
        value: metaobject.handle
    }));

    const typeResponse = await admin.graphql(
        `#graphql
            query TypeDefinitions($type: String!) {
                metaobjectDefinitionByType(type: $type) {
                    metaobjects(first: 250) {
                        nodes {
                            handle
                            name: field(key: "name") {
                                value
                            }
                        }
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
    const typeResult = await typeResponse.json();
    const typeOptions = typeResult.data.metaobjectDefinitionByType.metaobjects.nodes.map((metaobject: any) => ({
        label: metaobject.name.value,
        value: metaobject.handle
    }));

    const assortmentResponse = await admin.graphql(
        `#graphql
            query AssortmentDefinitions($type: String!) {
                metaobjectDefinitionByType(type: $type) {
                    metaobjects(first: 250) {
                        nodes {
                            handle
                            name: field(key: "name") {
                                value
                            }
                        }
                    }
                }
            }
        `,
        {
            variables: {
                type: "assortment"
            }
        }
    );
    const assortmentResult = await assortmentResponse.json();
    const assortmentOptions = assortmentResult.data.metaobjectDefinitionByType.metaobjects.nodes.map((metaobject: any) => ({
        label: metaobject.name.value,
        value: metaobject.handle
    }));

    const customizationResponse = await admin.graphql(
        `#graphql
            query CustomizationDefinition($type: MetafieldOwnerType!) {
                metafieldDefinition(identifier: {ownerType: $type, namespace: "custom", key: "customizable"}) {
                    validations {
                        name
                        value
                    }
                }
            }
        `,
        {
            variables: {
                type: "PRODUCT"
            }
        }
    );
    const customizationResult = await customizationResponse.json();
    const customizationOptions = JSON.parse(customizationResult.data.metafieldDefinition.validations.filter((validation: any) => validation.name === "choices")[0].value).map((item: string) => ({
        label: item,
        value: item
    }));

    const occasionResponse = await admin.graphql(
        `#graphql
            query OccasionDefinition($type: String!) {
                metaobjectDefinitionByType(type: $type) {
                    fieldDefinitions {
                        key
                        validations {
                            name
                            value
                        }
                    }
                }
            }
        `,
        {
            variables: {
                type: "occasion"
            }
        }
    );
    const occasionResult = await occasionResponse.json();
    const occasionOptions = JSON.parse(occasionResult.data.metaobjectDefinitionByType.fieldDefinitions.filter((field: any) => field.key === "name")[0].validations.filter((validation: any) => validation.name === "choices")[0].value).map((item: string) => ({
        label: item,
        value: item
    }));

    return { channels, brandOptions, typeOptions, assortmentOptions, customizationOptions, occasionOptions };
}

export default function Index() {
  const [currentChannel, setCurrentChannel] = useState(0);
  const [isChanged, setIsChanged] = useState(false);

  const {channels, brandOptions, typeOptions, assortmentOptions, customizationOptions, occasionOptions } = useLoaderData<typeof loader>();
  const [data, setData] = useState(channels);

  useEffect(() => {
    const hasChanged = !deepCompare(data, channels);
    setIsChanged(hasChanged);
  }, [data])

  const handleAddRule = () => {
    const newChannels = [...data];
    const channelToUpdate = { ...newChannels[currentChannel] };
    const newRule = {
        title: "",
        type: true,
        variant: "All",
        brand: "ALL",
        product: "ALL",
        occasion: "ALL",
        assortment: "ALL",
        customization: "ALL",
        edit: true,
        handle: `${channelToUpdate}-${new Date().getTime()}`
    }; 
    channelToUpdate.rules = [...channelToUpdate.rules, newRule];
    newChannels[currentChannel] = channelToUpdate;
    setData(newChannels);
  };

  const handleRemove = (ruleIndex: number) => {
    const newChannels = [...data];
    const channelToUpdate = { ...newChannels[currentChannel] };
    channelToUpdate.rules = channelToUpdate.rules.filter((_, index) => index !== ruleIndex);
    newChannels[currentChannel] = channelToUpdate;
    setData(newChannels);
  };

  const handleMove = (ruleIndex: number, direction: "UP" | "DOWN") => {
    const newChannels = [...data];
    const channelToUpdate = { ...newChannels[currentChannel] };
    const newRules = [...channelToUpdate.rules];
    const newIndex = direction === "UP" ? ruleIndex - 1 : ruleIndex + 1;
    if (newIndex >= 0 && newIndex < newRules.length) {
        [newRules[ruleIndex], newRules[newIndex]] = [newRules[newIndex], newRules[ruleIndex]];
        channelToUpdate.rules = newRules;
        newChannels[currentChannel] = channelToUpdate;
        setData(newChannels);
    }
  };

  const handleFieldChange = (ruleIndex: number, field: "TITLE" | "TYPE" | "VARIANT" | "BRAND" | "PRODUCT" | "OCCASION" | "ASSORTMENT" | "CUSTOMIZATION" | "EDIT", value?: string) => {
    const newChannels = [...data];
    const channelToUpdate = { ...newChannels[currentChannel] };
    const newRules = [...channelToUpdate.rules];
    const ruleToUpdate = { ...newRules[ruleIndex] };
    switch (field) {
        case "EDIT":
            ruleToUpdate.edit = !ruleToUpdate.edit;
            break;
        case "CUSTOMIZATION":
            if (value) {
                ruleToUpdate.customization = value;
            }
            break;
        case "ASSORTMENT":
            if (value) {
                ruleToUpdate.assortment = value;
            }
            break;
        case "OCCASION":
            if (value) {
                ruleToUpdate.occasion = value;
            }
            break;
        case "PRODUCT":
            if (value) {
                ruleToUpdate.product = value;
            }
            break;
        case "BRAND":
            if (value) {
                ruleToUpdate.brand = value;
            }
            break;
        case "VARIANT":
            if (value) {
                ruleToUpdate.variant = value;
            }
            break;
        case "TYPE":
            if (value) {
                if (value === "true") {
                    ruleToUpdate.type = true;
                } else {
                    ruleToUpdate.type = false;
                }
            }
            break;
        case "TITLE":
            if (value) {
                ruleToUpdate.title = value;
            }
            break;
    }
    newRules[ruleIndex] = ruleToUpdate;
    channelToUpdate.rules = newRules;
    newChannels[currentChannel] = channelToUpdate;
    setData(newChannels);
  };

  const actionFetcher = useFetcher();
  useEffect(() => {
    if (actionFetcher.data !== undefined) {
        window.location.reload();
    }
  }, [actionFetcher.data]);

  const handleSave = () => {
    for (const channel of channels) {
        const newChangedRule: Rule[] = [];
        const currentChannel = data.filter((newChannel: Channel) => channel.handle === newChannel.handle)[0];
        const originalMap = new Map();
        for (const rule of channel.rules) {
            originalMap.set(rule.handle, rule);
        }
        for (let i = 0; i < currentChannel.rules.length; i++) {
            const newRule = currentChannel.rules[i] as Rule;
            const originalRule = originalMap.get(newRule.handle);
            let ruleChanged = false;
            originalMap.delete(newRule.handle);
            if (!originalRule) {
                newChangedRule.push(newRule);
                continue;
            }
            if (i !== channel.rules.findIndex(r => r.handle === newRule.handle)) {
                ruleChanged = true;
            } else {
                for (const key in newRule) {
                    if (newRule[key as keyof Rule] !== originalRule[key]) {
                        ruleChanged = true;
                        break;
                    }
                }
            }
            if (ruleChanged) {
                newChangedRule.push(newRule);
            }
        }
        const deleteRules: string[] = [];
        for (const rule of channel.rules) {
            if (rule.id) {
                deleteRules.push(rule.id);
            }
        }
        const orderList: string[] = currentChannel.rules.map((rule: Rule) => rule.id ? rule.id : rule.handle);
        const form = new FormData();
        form.append("delete", JSON.stringify(deleteRules));
        form.append("newChange", JSON.stringify(newChangedRule));
        form.append("order", JSON.stringify(orderList));
        form.append("channel", JSON.stringify(channel));
        actionFetcher.submit(form, { method: 'POST', action: `/api/shopify/channel/update`});
    }
  };

  return (
    <Page 
      fullWidth
      title="Sales Channels"
      backAction={{
        content: "SAP Sync",
        url: "/app"
      }}
      primaryAction={{
        content: "Save",
        onAction: handleSave,
        disabled: !isChanged
      }}
      secondaryActions={[{
        content: "Cancel",
        onAction: () => setData(channels),
        disabled: !isChanged
      }]}
    >
      <BlockStack gap="500">
        <Layout>
            <Layout.Section variant="oneThird">
                <Card padding="0">
                    <ResourceList
                        resourceName={{singular: "channel", plural: "channels"}}
                        items={data}
                        renderItem={(item, id, index) => {
                            return (
                                <ResourceItem
                                    id={id}
                                    accessibilityLabel={`View details for ${item.title} sales channel`}
                                    onClick={() => setCurrentChannel(index)}
                                    disabled={currentChannel === index}
                                >
                                    <Text variant="bodyMd" fontWeight="bold" as="h3" tone={currentChannel === index ? "disabled" : "base"}>
                                        {item.title}
                                    </Text>
                                    <InlineStack gap="200">
                                        {item.external ?
                                            <Badge>{item.external}</Badge>
                                        :
                                            null
                                        }
                                        {item.location}
                                    </InlineStack>
                                </ResourceItem>
                            );
                        }}
                    />
                </Card>
            </Layout.Section>
            <Layout.Section>
                <Card>
                    <BlockStack gap="400">
                        <Text variant="headingMd" as="h2" key="Heading">
                            {data[currentChannel].title}
                        </Text>
                        {data[currentChannel].rules.map((rule, index) => (
                            <Box borderColor="border" borderWidth="025" borderRadius="150" padding="200" key={`Rule-${index}`}>
                                <InlineGrid gap="200" columns={['twoThirds', 'oneThird']}>
                                    <TextField
                                        label="Title"
                                        labelHidden
                                        disabled={!rule.edit}
                                        value={rule.title}     
                                        autoComplete="off" 
                                        onChange={(newValue: string) => handleFieldChange(index, "TITLE", newValue)}                       
                                    />
                                    <InlineGrid gap="200" columns={4}>
                                        <Button icon={ChevronUpIcon} onClick={() => handleMove(index, "UP")} disabled={index === 0}></Button>
                                        <Button icon={ChevronDownIcon} onClick={() => handleMove(index, "DOWN")} disabled={index === data[currentChannel].rules.length - 1}></Button>
                                        <Button variant="primary" icon={!rule.edit ? EditIcon : XIcon} onClick={() => handleFieldChange(index, "EDIT")}></Button>
                                        <Button variant="primary" tone="critical" icon={DeleteIcon} onClick={() => handleRemove(index)}></Button>
                                    </InlineGrid>
                                </InlineGrid>
                                <Collapsible
                                    id="1"
                                    open={rule.edit}
                                    transition={{duration: '500ms', timingFunction: 'ease-in-out'}}
                                    expandOnPrint
                                >
                                    <BlockStack gap="300">
                                        <InlineStack gap="500">
                                            <Checkbox 
                                                label="Exclusive Rule"
                                                checked={!rule.type}
                                                onChange={(newValue: boolean) => handleFieldChange(index, "TYPE", (!newValue).toString())}
                                            />
                                        </InlineStack>
                                        <InlineGrid gap="200" columns={3}>
                                            <Select
                                                label="Variant"
                                                options={[
                                                    {label: rule.type ? "All" : "", value: "ALL"},
                                                    {label: "B2B", value: "b2b"},
                                                    {label: "D2C", value: "d2c"}
                                                ]}
                                                value={rule.variant}
                                                onChange={(newValue: string) => handleFieldChange(index, "VARIANT", newValue)}            
                                            />
                                            <Select
                                                label="Brand"
                                                options={[{label: rule.type ? "All" : "", value: "ALL"}, ...brandOptions]}
                                                value={rule.brand}
                                                onChange={(newValue: string) => handleFieldChange(index, "BRAND", newValue)}                         
                                            />
                                            <Select
                                                label="Product Type"
                                                options={[{label: rule.type ? "All" : "", value: "ALL"}, ...typeOptions]}
                                                value={rule.product}
                                                onChange={(newValue: string) => handleFieldChange(index, "PRODUCT", newValue)}            
                                            />
                                            <Select
                                                label="Occasion"
                                                options={[{label: rule.type ? "All" : "", value: "ALL"}, ...occasionOptions]}
                                                value={rule.occasion}         
                                                onChange={(newValue: string) => handleFieldChange(index, "OCCASION", newValue)}                    
                                            />
                                            <Select
                                                label="Assortment"
                                                options={[{label: rule.type ? "All" : "", value: "ALL"}, ...assortmentOptions]}
                                                value={rule.assortment}
                                                onChange={(newValue: string) => handleFieldChange(index, "ASSORTMENT", newValue)}                       
                                            />
                                            <Select
                                                label="Customization"
                                                options={[{label: rule.type ? "All" : "", value: "ALL"}, ...customizationOptions]}
                                                value={rule.customization}
                                                onChange={(newValue: string) => handleFieldChange(index, "CUSTOMIZATION", newValue)}    
                                            />
                                        </InlineGrid>
                                    </BlockStack>
                                </Collapsible>
                            </Box>
                        ))}
                        <Button fullWidth variant="primary" onClick={() => handleAddRule()} key="AddNewRule">Add New Rule</Button>
                    </BlockStack>
                </Card>  
            </Layout.Section>
        </Layout>
        <FooterHelp>
            For any questions or help please submit a ticket to the HelpDesk.
        </FooterHelp>
      </BlockStack>
    </Page>
  );
}

function deepCompare(arr1: Channel[], arr2: Channel[]): boolean {
    for (let i = 0; i < arr1.length; i++) {
        const channel1 = arr1[i];
        const channel2 = arr2[i];
        if (channel1.rules.length !== channel2.rules.length) {
            return false;
        }
        for (let j = 0; j < channel1.rules.length; j++) {
            const rule1 = channel1.rules[j];
            const rule2 = channel2.rules[j];
            if (rule1.title !== rule2.title || rule1.type !== rule2.type || rule1.variant !== rule2.variant || rule1.product !== rule2.product || rule1.occasion !== rule2.occasion || rule1.customization !== rule2.customization || rule1.brand !== rule2.brand || rule1.assortment !== rule2.assortment) {
                return false;
            }
        }
    }
    return true;
}
