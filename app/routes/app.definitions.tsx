import {
  Page,
  Text,
  BlockStack,
  Box,
  Layout,
  Tabs,
  Card,
  ResourceList,
  ResourceItem,
  Filters,
  FooterHelp,
  TextField,
  Spinner,
  InlineGrid,
  Button,
  ButtonGroup,
  InlineStack,
  Divider,
  Select,
  ChoiceList,
  DropZone,
  Thumbnail
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import { DeleteIcon, ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons';

interface Reply {
    definitions?: DefinitionPreview[];
    moreDefinitions?: boolean;
    validations?: string[];
    name?: string;
    type?: string;
    fields?: MetaObjectField[];
}

interface MetaObjectField {
    key: string;
    value: string;
    type: string;
    name: string;
    options?: string[];
}

interface DefinitionPreview {
    id: string;
    name: string;
}

export default function Index() {
    const [currentDefinitionType, setCurrentDefintionType] = useState(0);
    const [currentObj, setCurrentObj] = useState("");
    const [typeLoading, setTypeLoading] = useState(true);
    const [objLoading, setObjLoading] = useState(true);
    const [isObjChanged, setIsObjChanged] = useState(false);

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
            id: "occasionName",
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
    const [originalValidationList, setOriginalValidationList] = useState<string[]>([]);

    const [objName, setObjName] = useState("");
    const [fieldList, setFieldList] =useState<MetaObjectField[]>([]);
    const [originalFieldList, setOriginalFieldList] =useState<MetaObjectField[]>([]);

    useEffect(() => {
        const hasChanged = JSON.stringify(validationList) !== JSON.stringify(originalValidationList);
        setIsObjChanged(hasChanged);
    }, [validationList]);

    const fetcher = useFetcher();

    useEffect(() => {
        setTypeLoading(true);
        setCurrentObj("");
        setMoreDefinitions(false);
        setDefintionList([]);
    }, [currentDefinitionType]);

    useEffect(() => {
        setValidationList([]);
        setIsObjChanged(false);
        setOriginalValidationList([]);
        setObjName("");
        setFieldList([]);
        setOriginalFieldList([]);
    }, [currentDefinitionType, currentObj]);

    useEffect(() => {
        setObjLoading(true);
    }, [currentObj])

    useEffect(() => {
        fetcher.load(`/api/shopify/${tabs[currentDefinitionType].id}/get${queryValue ? `?search=${queryValue}` : ""}`);
    }, [currentDefinitionType, queryValue]);

    useEffect(() => {
        fetcher.load(`/api/shopify/metaobject/get/${currentObj.replace("gid://shopify/Metaobject/", "")}`);
    }, [currentObj])

    useEffect(() => {
        if (fetcher.data) {
          const replyData = fetcher.data as Reply;

          if (replyData.type && replyData.type === tabs[currentDefinitionType].id) {
            setObjName(replyData.name ? replyData.name : "");
            setFieldList(replyData.fields ? replyData.fields : []);
            setOriginalFieldList(replyData.fields ? replyData.fields : []);
            setObjLoading(false);
          } else {
            setMoreDefinitions(replyData.moreDefinitions ? replyData.moreDefinitions : false);
            setDefintionList(replyData.definitions ? replyData.definitions : []);
            setValidationList(replyData.validations ? replyData.validations : []);
            setOriginalValidationList(replyData.validations ? replyData.validations : []);
            setTypeLoading(false);
          }
        }
    },[
        fetcher.data
    ]);

    const handleRemove = (validationsIndex: number) => {
       const newValidations = validationList.filter((_, index) => index !== validationsIndex);
       setValidationList(newValidations);
    };

    const handleMove = (validationsIndex: number, direction: "UP" | "DOWN") => {
        const newValidations = [...validationList];
        if (direction === "UP" && validationsIndex > 0) {
            [newValidations[validationsIndex], newValidations[validationsIndex - 1]] = [newValidations[validationsIndex - 1], newValidations[validationsIndex]]
        } else if (direction === "DOWN" && validationsIndex < validationList.length - 1) {
            [newValidations[validationsIndex], newValidations[validationsIndex + 1]] = [newValidations[validationsIndex + 1], newValidations[validationsIndex]]
        }
        setValidationList(newValidations);
    };

    const addValidation = () => {
        const newValidations = [...validationList, ""];
        setValidationList(newValidations);
    };

    const handleValidationChange = (index: number, newValue: string) => {
        const newValidations = validationList.map((validation, i) => {
            if (i === index) {
                return newValue;
            }
            return validation;
        });
        setValidationList(newValidations);
    };

    const handleCancel = (object: string) => {
        if (object === "occasionName" || object === "tone") {
            setValidationList(originalValidationList);
        } else {
            setFieldList(originalFieldList);
        }
    };

    const handleSave = (object: string) => {
        //TODO
    };

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
                    {tabs[currentDefinitionType].id !== "occasionName" && tabs[currentDefinitionType].id !== "tone" ?
                        <Card padding="0">
                            <BlockStack gap="300">
                                <ResourceList
                                    resourceName={{singular: tabs[currentDefinitionType].content, plural: tabs[currentDefinitionType].content}}
                                    items={definitionList}
                                    filterControl={
                                        <InlineGrid gap="100" columns={['twoThirds', 'oneThird']} alignItems="center">
                                            <Filters 
                                                filters={[]}
                                                appliedFilters={[]}
                                                onQueryChange={(newValue: string) => setQueryValue(newValue)}
                                                onQueryClear={() => setQueryValue("")}
                                                onClearAll={() => setQueryValue("")}
                                                hideFilters
                                                queryValue={queryValue}
                                            />
                                            <Button variant={/* //TODO */ "primary"}>Add New</Button>
                                        </InlineGrid>
                                    }
                                    renderItem={(item, id) => { 
                                        return (
                                            <ResourceItem
                                                id={id}
                                                accessibilityLabel={`View details for ${item.name} definition.`}
                                                onClick={() => setCurrentObj(item.id)}
                                                disabled={item.id === currentObj}
                                            >
                                                <Text variant="bodyMd" fontWeight={item.id === currentObj ? "regular" : "bold"} tone={item.id === currentObj ? "disabled" : "base"} as="h3">
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
                    {currentObj || validationList.length > 0 ? 
                        objLoading && validationList.length === 0 ?
                            <Spinner accessibilityLabel="Loading Definition" size="large" />
                        :
                            <Card>
                                <BlockStack gap="400">
                                    <InlineGrid gap="400" columns={['twoThirds', 'oneThird']} alignItems="center">
                                        <Text variant="headingLg" as="h2" key="Heading">
                                            {tabs[currentDefinitionType].id === "occasionName" || tabs[currentDefinitionType].id === "tone" ? 
                                                tabs[currentDefinitionType].content
                                            :
                                                objName
                                            }
                                        </Text>
                                        <InlineStack direction="row-reverse">
                                            <ButtonGroup>
                                                <Button onClick={() => handleCancel(tabs[currentDefinitionType].id)} disabled={!isObjChanged}>Cancel</Button>
                                                <Button variant="primary" onClick={() => handleSave(tabs[currentDefinitionType].id)} disabled={!isObjChanged}>Save</Button> 
                                            </ButtonGroup>
                                        </InlineStack>
                                    </InlineGrid>
                                    <Divider />
                                    { validationList.length > 0 ?
                                        <>
                                            {validationList.map((validation, index) => (
                                                <InlineGrid gap="200" columns={['twoThirds', 'oneThird']} key={`${tabs[currentDefinitionType].id}-${validation}`}>
                                                    <TextField
                                                        label="validation"
                                                        labelHidden
                                                        value={validation}
                                                        onChange={(newValue: string) => handleValidationChange(index, newValue)}
                                                        autoComplete="off"
                                                    />
                                                    <InlineGrid gap="200" columns={3}>
                                                        <Button icon={ChevronUpIcon} onClick={() => handleMove(index, "UP")} disabled={index === 0}></Button>
                                                        <Button icon={ChevronDownIcon} onClick={() => handleMove(index, "DOWN")} disabled={index === validationList.length - 1}></Button>
                                                        <Button variant="primary" tone="critical" icon={DeleteIcon} onClick={() => handleRemove(index)} disabled={validationList.length === 1}></Button>
                                                    </InlineGrid>
                                                </InlineGrid>
                                            ))}
                                            <Button fullWidth variant="primary" onClick={() => addValidation()} key="AddNewValidation">Add New {tabs[currentDefinitionType].content}</Button>
                                        </>
                                    :
                                        <>
                                            {fieldList.map((field, index) => {
                                                 if (field.options && field.options.length > 0) {
                                                    if (field.type.startsWith("list.")) {
                                                        return (
                                                            <ChoiceList 
                                                                allowMultiple
                                                                title={field.name}
                                                                choices={field.options.map(option => ({label: option, value: option}))}
                                                                selected={JSON.parse(field.value)}
                                                                onChange={() => {}} //TODO
                                                            />
                                                        );
                                                    } else {
                                                        return (
                                                            <Select
                                                                label={field.name}
                                                                options={field.options.map(option => ({label: option, value: option}))}
                                                                value={field.value}
                                                                onChange={() => {}} //TODO
                                                            />
                                                        );
                                                    }
                                                } else {
                                                    if (field.type === "single_line_text_field") {
                                                        return (
                                                            <TextField 
                                                                label={field.name}
                                                                value={field.value ? field.value : ""}
                                                                onChange={() => {}} //TODO
                                                                autoComplete="off"
                                                            />
                                                        );
                                                    } else if (field.type === "list.single_line_text_field") {
                                                        //Multi Textfield
                                                    } else if (field.type === "multi_line_text_field") {
                                                        return (
                                                            <TextField 
                                                                label={field.name}
                                                                value={field.value ? field.value : ""}
                                                                onChange={() => {}} //TODO
                                                                autoComplete="off"
                                                                multiline={4}
                                                            />
                                                        );
                                                    } else if (field.type === "file_reference") {
                                                        return (
                                                            <DropZone 
                                                                label={field.name}
                                                                allowMultiple={false}
                                                                onDrop={() => {}} //TODO
                                                            >
                                                                {field.value !== null ?
                                                                    <Thumbnail 
                                                                        size="large"
                                                                        alt={field.key}
                                                                        source={field.value} //TODO
                                                                    />
                                                                :
                                                                    null
                                                                }
                                                                <DropZone.FileUpload actionHint="Accepts JPEG, PNG, WEBP, SVG, HEIC, GIF, MOV and MP4. Files must be under 20MB." />
                                                            </DropZone>
                                                        );
                                                    } else if (field.type === "boolean") {
                                                        return (
                                                            <ChoiceList 
                                                                title={field.name}
                                                                choices={[
                                                                    { label: "Yes", value: "true" },
                                                                    { label: "No", value: "false" }
                                                                ]}
                                                                selected={[...(field.value ? field.value : "false")]}
                                                                onChange={() => {}} //TODO
                                                            />
                                                        );
                                                    } else if (field.type === "money") {
                                                        let amount = null;
                                                        if (field.value !== null) {
                                                            amount = JSON.parse(field.value);
                                                        }
                                                        return (
                                                            <TextField 
                                                                label={field.name}
                                                                value={amount && amount.amount ? amount.amount : ""}
                                                                onChange={() => {}} //TODO
                                                                autoComplete="off"
                                                                type="currency"
                                                                prefix="$"
                                                            />
                                                        );
                                                    } else if (field.type === "number_integer") {
                                                        return (
                                                            <TextField 
                                                                label={field.name}
                                                                value={field.value ? field.value : ""}
                                                                onChange={() => {}} //TODO
                                                                autoComplete="off"
                                                                type="integer"
                                                            />
                                                        );
                                                    } else if (field.type === "metaobject_reference") {
                                                        //TODO
                                                    }
                                                }
                                            })}
                                        </>
                                    }
                                </BlockStack>
                            </Card>
                            : null}
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