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
  InlineGrid,
  Button,
  ButtonGroup,
  InlineStack,
  Select,
  ChoiceList,
  DropZone,
  Thumbnail,
  Badge,
  SkeletonBodyText
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import { DeleteIcon, ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons';
import { TabReply, DefinitionPreview } from "./api.shopify.$definitionType.get";
import { DefinitionReply } from "./api.shopify.metaobject.get.$id";

export default function Index() {
    const [selectedTab, setSelectedTab] = useState(0);
    const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);

    const [currentTab, setCurrentTab] = useState<TabReply | null>(null);
    const [currentDefinition, setCurrentDefinition] = useState<DefinitionReply | null>(null);
    const [originalDefinition, setOriginalDefinition] = useState<DefinitionReply| null>(null);
    const [currentValidations, setCurrentValidations] = useState<string[]>([]);
    const [originalValidations, setOriginalValidations] = useState<string[]>([]);

    const tabFetcher = useFetcher();
    const defintionFetcher = useFetcher();
    const actionFetcher = useFetcher();

    const [queryValue, setQueryValue] = useState("");

    const [isCurrentDefinitionChanged, setCurrentDefinitionChanged] = useState(false);

    useEffect(() => {
        setCurrentDefinitionChanged(areValidationsDifferent(currentValidations, originalValidations));
    }, [currentValidations]);

    useEffect(() => {
        console.log("==================================================");
        console.log("==================================================");
        console.log(currentDefinition);
        console.log(originalDefinition);
        console.log("--------------------------------------------------");
        setCurrentDefinitionChanged(!areDefinitionsDifferent(currentDefinition, originalDefinition));
        console.log("==================================================");
        console.log("==================================================");
    }, [currentDefinition])

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
            content: "Occasion",
            accessibilityLabel: "Occasion",
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
            id: "recipient",
            content: "Recipient Group",
            accessibilityLabel: "Recipient Group"
        },
        {
            id: "size",
            content: "Size",
            accessibilityLabel: "Size",
        },
        {
            id: "tone",
            content: "Tone",
            accessibilityLabel: "Tone",
        }
    ];

    useEffect(() => {
        const tabId = tabs[selectedTab].id;
        tabFetcher.load(`/api/shopify/${tabId}/get${queryValue ? `?search=${queryValue}` : ""}`);
        setSelectedDefinition(null);
        setCurrentDefinition(null);
        console.log("SET3")
        setOriginalDefinition(null);
        setCurrentValidations([]);
        setOriginalValidations([])
    }, [selectedTab, queryValue]);

    useEffect(() => {
        const data = tabFetcher.data as TabReply;
        if (data !== undefined) {
            if (data.validations !== null) {   
                setCurrentValidations([...data.validations]);
                setOriginalValidations([...data.validations]);
                setCurrentTab(null);
            } else {
                setCurrentTab(data);
            }
        }
    }, [tabFetcher.data]);

    useEffect(() => {
        if (selectedDefinition) {
            defintionFetcher.load(`/api/shopify/metaobject/get/${selectedDefinition.replace("gid://shopify/Metaobject/", "")}`);
        }
    }, [selectedDefinition]);

    useEffect(() => {
        const data = defintionFetcher.data as DefinitionReply;
        setCurrentDefinition(data);
        console.log("SET2")
        setOriginalDefinition(data);
    }, [defintionFetcher.data]);

    const handleTabChange = useCallback((selectedTabIndex: number) => {
        setSelectedTab(selectedTabIndex);
    }, []);

    const handleDefinitionSelect = useCallback((item: DefinitionPreview) => {
        setSelectedDefinition(item.id);
    }, []);

    const handleCancel = () => {
        if (currentDefinition === null || currentDefinition === undefined) {
            setCurrentValidations(originalValidations);
        } else {
            setCurrentDefinition(originalDefinition);
        }
    };

    const handleDelete = (id: string | null) => {
        if (id !== null) {
            actionFetcher.load(`/api/shopify/metaobject/delete/${id.replace("gid://shopify/Metaobject/", "")}`);
        }
    };

    useEffect(() => {
        console.log("SET1")
        setSelectedDefinition(null);
        setCurrentDefinition(null);
        setOriginalDefinition(null);
        setCurrentValidations([]);
        setOriginalValidations([]);
    }, [actionFetcher.data]);

    const handleSave = (id: string, field: string) => {
        if (field === "recipient" || field === "tone" || field === "occasionName") {
            if (currentValidations) {
                const form = new FormData();
                form.append("validations", JSON.stringify(currentValidations));
                actionFetcher.submit(form, { method: 'POST', action: `/api/shopify/${id}/update`});
            }
        } else {
            if (currentDefinition) {
                const form = new FormData();
                form.append("fields", JSON.stringify(currentDefinition.fields));
                actionFetcher.submit(form, { method: 'POST', action: `/api/shopify/metaobject/upsert/${selectedDefinition?.replace("gid://shopify/Metaobject/", "")}`});
            }
        }
    };

    const handleRemove = (index: number, field: string) => {
        if (field === "definition") {
            const newValidations = currentValidations.filter((_, i) => i !== index);
            setCurrentValidations(newValidations);
        } else {
            if (currentDefinition) {
                const newFields = currentDefinition?.fields.map((item) => {
                    if (item.key === field) {
                        const tempValidations: string[] = JSON.parse(item.value);
                        const newValidations = tempValidations.filter((_, i) => i !== index);
                        item.value = JSON.stringify(newValidations);
                    }
                    return item;
                });
                const newDefinition = {
                    type: currentDefinition.type,
                    name: currentDefinition.name,
                    fields:newFields,
                    isUsed: currentDefinition.isUsed
                };
                setCurrentDefinition(newDefinition);
            }
        }
    };

    const addValidation = (field: string) => {
        if (field === "definition") {
            const newValidations = [...currentValidations, ""];
            setCurrentValidations(newValidations);
        } else {
            if (currentDefinition) {
                const newFields = currentDefinition.fields.map((item) => {
                    if (item.key === field) {
                        const newValidations: string[] = [...JSON.parse(item.value), ""];
                        item.value = JSON.stringify(newValidations);
                    }
                    return item;
                });
                const newDefinition = {
                    type: currentDefinition.type,
                    name: currentDefinition.name,
                    fields:newFields,
                    isUsed: currentDefinition.isUsed
                };
                setCurrentDefinition(newDefinition);
            }
        }
    };

    const handleValidationChange = (index: number, newValue: string, field: string) => {
        if (field === "definition") {
            const newValidations = currentValidations.map((validation, i) => {
                if (i === index) {
                    return newValue;
                }
                return validation;
            });
            setCurrentValidations(newValidations);
        } else {
            if (currentDefinition) {
                const newFields = currentDefinition.fields.map((item) => {
                    if (item.key === field) {
                        const tempValidations: string[] = JSON.parse(item.value);
                        const newValidations = tempValidations.map((validation, i) => {
                            if (i === index) {
                                return newValue;
                            } else {
                                return validation;
                            }
                        });
                        item.value = JSON.stringify(newValidations);
                    }
                    return item;
                });
                const newDefinition = {
                    type: currentDefinition.type,
                    name: currentDefinition.name,
                    fields:newFields,
                    isUsed: currentDefinition.isUsed
                };
                setCurrentDefinition(newDefinition);
            }
        }
    }

    const handleMove = (index: number, direction: "UP" | "DOWN", field: string) => {
        if (field === "definition") {
            const newValidations = [...currentValidations];
            if (direction === "UP" && index > 0) {
                [newValidations[index], newValidations[index - 1]] = [newValidations[index - 1], newValidations[index]]
            } else if (direction === "DOWN" && index < currentValidations.length - 1) {
                [newValidations[index], newValidations[index + 1]] = [newValidations[index + 1], newValidations[index]]
            }
            setCurrentValidations(newValidations);
        } else {
            if (currentDefinition) {
                const newFields = currentDefinition.fields.map((item) => {
                    if (item.key === field) {
                        const newValidations: string[] = JSON.parse(item.value);
                        if (direction === "UP" && index > 0) {
                            [newValidations[index], newValidations[index - 1]] = [newValidations[index - 1], newValidations[index]]
                        } else if (direction === "DOWN" && index < currentValidations.length - 1) {
                            [newValidations[index], newValidations[index + 1]] = [newValidations[index + 1], newValidations[index]]
                        }
                        item.value = JSON.stringify(newValidations);
                    }
                    return item;
                });
                const newDefinition = {
                    type: currentDefinition.type,
                    name: currentDefinition.name,
                    fields:newFields,
                    isUsed: currentDefinition.isUsed
                };
                setCurrentDefinition(newDefinition);
            }
        }
    };

    const handleFieldChange = (field: string, newValue: string | string[] | File) => {
        if (currentDefinition) {
            const newFields = currentDefinition.fields.map((item) => {
                if (field === item.key) {
                    if (newValue instanceof File) {
                        item.value = window.URL.createObjectURL(newValue);
                        //TODO may need more to save it
                    } else {
                        if (Array.isArray(newValue)) {
                            item.value = JSON.stringify(newValue);
                        } else {
                            item.value = newValue;
                        }
                    }
                }
                return item;
            });
            const newDefinition = {
                type: currentDefinition.type,
                name: currentDefinition.name,
                fields:newFields,
                isUsed: currentDefinition.isUsed
            };
            console.log("PING")
            setCurrentDefinition(newDefinition);
        }
    }

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
                <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange} />
                <Layout>
                    <Layout.Section variant="oneThird">
                        {tabFetcher.state === "loading" || tabFetcher.state === "submitting" ?
                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingMd" as="h2">Loading...</Text>
                                    <SkeletonBodyText lines={5} />
                                </BlockStack>
                            </Card>
                        : currentTab !== null && currentTab.definitions !== null ?
                            <Card padding="0">
                                <BlockStack gap="300">
                                    <ResourceList 
                                        items={currentTab !== null ? currentTab.definitions : []}
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
                                                {/* //TODO <Button variant={"primary"}>Add New</Button>*/}
                                            </InlineGrid>
                                        }
                                        renderItem={(item: DefinitionPreview) => {
                                            const {id, name, defined} = item;
                                            return (
                                                <ResourceItem
                                                    id={id}
                                                    onClick={() => handleDefinitionSelect(item)}
                                                    key={id}
                                                    disabled={selectedDefinition === id}
                                                    accessibilityLabel={`View details for ${name}`}
                                                >
                                                    <InlineStack gap="300">
                                                        <Text variant="bodyMd" fontWeight={id === selectedDefinition ? "regular" : "bold"} tone={id === selectedDefinition ? "disabled" : "base"} as="h3">
                                                            {name}
                                                        </Text>
                                                        {defined ? null :
                                                            <Badge tone="warning-strong">UNDEFINED</Badge>
                                                        }
                                                    </InlineStack>
                                                </ResourceItem>
                                            );
                                        }}
                                    />
                                    {currentTab?.moreDefinitions ?
                                        <Box borderColor="border" borderWidth="025" borderRadius="150" padding="100">
                                            <Text variant="bodyMd" as="p" alignment="center">There are additional definitions. Please refine with search.</Text>
                                        </Box>
                                    : null}
                                </BlockStack>
                            </Card>
                        :
                            null
                        }
                    </Layout.Section>
                    <Layout.Section>
                        {defintionFetcher.state === "loading" || defintionFetcher.state === "submitting" ?
                            <Card>
                                <BlockStack gap="200">
                                    <Text variant="headingMd" as="h2">Loading Details...</Text>
                                    <SkeletonBodyText lines={3} />
                                </BlockStack>
                            </Card>
                        : (currentDefinition !== null && currentDefinition !== undefined) || currentValidations.length !== 0 ?
                            <Card>
                                <BlockStack gap="400">
                                    <InlineGrid gap="400" columns={['twoThirds', 'oneThird']} alignItems="center">
                                        <Text variant="headingLg" as="h2" key="Heading">
                                            {currentValidations.length === 0 && currentDefinition ?
                                                currentDefinition.name
                                            :
                                                tabs[selectedTab].content
                                            }
                                        </Text>
                                        <InlineStack direction="row-reverse">
                                            <ButtonGroup>
                                                <Button onClick={handleCancel} disabled={!isCurrentDefinitionChanged}>Cancel</Button>
                                                {currentValidations.length === 0 ?
                                                    <Button variant="primary" tone="critical" onClick={() => handleDelete(selectedDefinition)} disabled={currentDefinition ? currentDefinition.isUsed : true}>Delete</Button>
                                                : null }
                                                <Button variant="primary" onClick={() => handleSave(tabs[selectedTab].id, tabs[selectedTab].id)} disabled={!isCurrentDefinitionChanged}>Save</Button>
                                            </ButtonGroup>
                                        </InlineStack>
                                    </InlineGrid>
                                    {currentValidations.length === 0 ?
                                        <>
                                            {currentDefinition?.fields.map((field, index) => {
                                                if (field.options && field.options.length > 0) {
                                                    if (field.type.startsWith("list.")) {
                                                        return (
                                                            <ChoiceList 
                                                                allowMultiple
                                                                title={field.name}
                                                                choices={field.options}
                                                                selected={JSON.parse(field.value)}
                                                                onChange={(newValue: string[]) => handleFieldChange(field.key, newValue)}
                                                            />
                                                        );
                                                    } else {
                                                        return (
                                                            <Select
                                                                label={field.name}
                                                                options={field.options}
                                                                value={field.value}
                                                                onChange={(newValue: string) => handleFieldChange(field.key, newValue)}
                                                            />
                                                        );
                                                    }
                                                } else {
                                                    if (field.type === "single_line_text_field") {
                                                        return (
                                                            <TextField 
                                                                label={field.name}
                                                                value={field.value ? field.value : ""}
                                                                onChange={(newValue: string) => handleFieldChange(field.key, newValue)}
                                                                autoComplete="off"
                                                            />
                                                        );
                                                    } else if (field.type === "list.single_line_text_field") {
                                                        return (
                                                            <Box borderColor="border" borderWidth="025" borderRadius="150" padding="100">
                                                                <BlockStack gap="100">
                                                                    <Text as="p" variant="bodyMd" >{field.name}</Text>
                                                                    {field.value ? JSON.parse(field.value).filter((option: string) => option != field.name).map((option: string, valueIndex: number) => (
                                                                        <InlineGrid gap="200" alignItems="center" columns={["twoThirds", "oneThird"]} >
                                                                            <TextField 
                                                                                label={option}
                                                                                labelHidden
                                                                                value={option}
                                                                                autoComplete="off"
                                                                                onChange={(newValue: string) => handleValidationChange(valueIndex, newValue, field.key)}
                                                                            />
                                                                            <InlineGrid gap="200" columns={3}>
                                                                                <Button icon={ChevronUpIcon} onClick={() => handleMove(valueIndex, "UP", field.key)} disabled={index === 0}></Button>
                                                                                <Button icon={ChevronDownIcon} onClick={() => handleMove(valueIndex, "DOWN", field.key)} disabled={index === JSON.parse(field.value).length - 1}></Button>
                                                                                <Button variant="primary" tone="critical" icon={DeleteIcon} onClick={() => handleRemove(index, field.key)} disabled={JSON.parse(field.value).length === 1}></Button>
                                                                            </InlineGrid>
                                                                        </InlineGrid>
                                                                    )): null}
                                                                    <Button fullWidth variant="primary" onClick={() => addValidation(field.key)}>Add New</Button>
                                                                </BlockStack>
                                                            </Box>
                                                        );
                                                    } else if (field.type === "multi_line_text_field") {
                                                        return (
                                                            <TextField 
                                                                label={field.name}
                                                                value={field.value ? field.value : ""}
                                                                onChange={(newValue: string) => handleFieldChange(field.key, newValue)}
                                                                autoComplete="off"
                                                                multiline={4}
                                                            />
                                                        );
                                                    } else if (field.type === "file_reference") {
                                                        return (
                                                            <DropZone 
                                                                label={field.name}
                                                                allowMultiple={false}
                                                                onDrop={(files: File[]) => handleFieldChange(field.key, files[0])}
                                                            >
                                                                {field.value !== null ?
                                                                    <BlockStack gap="200" inlineAlign="center">
                                                                        <Thumbnail 
                                                                            size="large"
                                                                            alt={field.key}
                                                                            source={field.value}
                                                                        />
                                                                        <Button>Replace file</Button>
                                                                    </BlockStack>
                                                                :
                                                                    null
                                                                }
                                                                {field.value === null || false ?
                                                                    <DropZone.FileUpload actionHint="Accepts JPEG, PNG, WEBP, SVG, HEIC, GIF, MOV and MP4. Files must be under 20MB." />
                                                                :
                                                                    null
                                                                }
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
                                                                onChange={(newValue: string[]) => handleFieldChange(field.key, newValue)}
                                                            />
                                                        );
                                                    } else if (field.type === "money") {
                                                        return (
                                                            <TextField 
                                                                label={field.name}
                                                                value={field.value !== null ? JSON.parse(field.value) && JSON.parse(field.value).amount ? JSON.parse(field.value).amount : "" : ""}
                                                                onChange={(newValue: string) => handleFieldChange(field.key, newValue)}
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
                                                                onChange={(newValue: string) => handleFieldChange(field.key, newValue)}
                                                                autoComplete="off"
                                                                type="integer"
                                                            />
                                                        );
                                                    }
                                                }
                                            })}
                                        </>
                                    :
                                        <>
                                            {currentValidations.map((validation, index) => (
                                                <InlineGrid gap="200" columns={['twoThirds', 'oneThird']} key={`${tabs[selectedTab].id}-${validation}`}>
                                                    <TextField
                                                        label="validation"
                                                        labelHidden
                                                        value={validation}
                                                        onChange={(newValue: string) => handleValidationChange(index, newValue, "definition")}
                                                        autoComplete="off"
                                                    />
                                                    <InlineGrid gap="200" columns={3}>
                                                        <Button icon={ChevronUpIcon} onClick={() => handleMove(index, "UP", "definition")} disabled={index === 0}></Button>
                                                        <Button icon={ChevronDownIcon} onClick={() => handleMove(index, "DOWN", "definition")} disabled={index === currentValidations.length - 1}></Button>
                                                        <Button variant="primary" tone="critical" icon={DeleteIcon} onClick={() => handleRemove(index, "definition")} disabled={currentValidations.length === 1}></Button>
                                                    </InlineGrid>
                                                </InlineGrid>
                                            ))}
                                            <Button fullWidth variant="primary" onClick={() => addValidation("definition")} key="AddNewValidation">Add New {tabs[selectedTab].content}</Button>
                                        </>
                                    }
                                </BlockStack>
                            </Card>
                        : 
                            null
                        }
                    </Layout.Section>
                </Layout>
                <FooterHelp>
                    For any questions or help please submit a ticket to the HelpDesk.
                </FooterHelp>
            </BlockStack>
        </Page>
    );
}

function areDefinitionsDifferent(obj1: DefinitionReply | null, obj2: DefinitionReply | null):boolean {
    console.log("test1");
    if (obj1 === null) {
        if (obj2 === null) {
            return false;
        }
        return true;
    }
    console.log("test2");
    if (obj2 === null) {
        return true;
    }
    console.log("test3");
    if (obj1.fields.length !== obj2.fields.length) {
        return true;
    }
    console.log("test4");
    for (let i = 0; i < obj1.fields.length; i++) {
        if (obj1.fields[i].value !== obj2.fields[i].value) {
            return true;
        }
    }
    console.log("test5");
    return false;
}

function areValidationsDifferent(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) {
        return true;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return true;
        }
    }
    return false;
}
