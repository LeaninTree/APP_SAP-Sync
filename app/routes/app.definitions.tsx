import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Page,
  BlockStack,
  Tabs,
  Card,
  Box,
  Text,
  Spinner,
  LegacyStack,
  ResourceList,
  ResourceItem,
  Layout,
  InlineStack,
  Badge,
  FooterHelp,
  Filters,
  Pagination,
  Button,
  InlineGrid,
  TextField,
  ButtonGroup,
  Select,
  ChoiceList,
  DropZone,
  Thumbnail,
} from '@shopify/polaris';
import { DeleteIcon, ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons';
import { DefinitionPreview, TabReply } from './api.shopify.$definitionType.get';

export type Field = {
  key: string;
  value: any;
  type: string;
  name: string;
  options?: { label: string, value: string }[];
  url?: string;
}

type DefinitionReply = {
  type: string;
  name: string;
  fields: Field[];
  isUsed: boolean;
};

export default function App() {
  const [selected, setSelected] = useState(0);
  const [definitions, setDefinitions] = useState<DefinitionPreview[] | null>(null);
  const [validations, setValidations] = useState<string[] | null>(null);
  const [editedValidations, setEditedValidations] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDefinition, setSelectedDefinition] = useState<string | null>(null);
  const [selectedDefinitionData, setSelectedDefinitionData] = useState<DefinitionReply | null>(null);
  const [editedDefinitionData, setEditedDefinitionData] = useState<DefinitionReply | null>(null);
  const [loadingDefinition, setLoadingDefinition] = useState(false);
  const [definitionError, setDefinitionError] = useState<string | null>(null);
  const [queryValue, setQueryValue] = useState('');
  const [status, setStatus] = useState<string[] | undefined>(['ALL']);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const itemsPerPage = 15;

  const tabs = [
    {
      id: "artist",
      content: "Artist",
      accessibilityLabel: "Artist",
      panelID: "artist-content",
    },
    {
      id: "assortment",
      content: "Assortment",
      accessibilityLabel: "Assortment",
      panelID: "assortment-content",
    },
    {
      id: "brand",
      content: "Brand",
      accessibilityLabel: "Brand",
      panelID: "brand-content",
    },
    {
      id: "category",
      content: "Category",
      accessibilityLabel: "Category",
      panelID: "category-content",
    },
    {
      id: "occasionName",
      content: "Occasion",
      accessibilityLabel: "Occasion",
      panelID: "occasion-content",
    },
    {
      id: "occasion",
      content: "Occasion Prefix",
      accessibilityLabel: "Occasion Prefix",
      panelID: "occasion-prefix-content",
    },
    {
      id: "processes",
      content: "Process",
      accessibilityLabel: "Process",
      panelID: "process-content",
    },
    {
      id: "recipient",
      content: "Recipient Group",
      accessibilityLabel: "Recipient Group",
      panelID: "recipient-group-content",
    },
    {
      id: "size",
      content: "Size",
      accessibilityLabel: "Size",
      panelID: "size-content",
    },
    {
      id: "tone",
      content: "Tone",
      accessibilityLabel: "Tone",
      panelID: "tone-content",
    }
  ];

  const handleTabChange = useCallback(
    (selectedTabIndex: number) => {
      setSelected(selectedTabIndex);
      setQueryValue('');
      setStatus(['ALL']);
      setCurrentPage(1);
    },
    [],
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQueryValue(value);
      setCurrentPage(1);
    },
    [],
  );

  const handleQueryClear = useCallback(() => setQueryValue(''), []);
  const handleStatusChange = useCallback(
    (value: string[]) => {
      setStatus(value);
      setCurrentPage(1);
    },
    [],
  );
  
  const handleAdd = useCallback(async () => {
    setIsAdding(true);
    setError(null);
    const tabId = tabs[selected].id;
    const url = `/api/shopify/metaobject/create/${tabId}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.id) {
        setSelectedDefinition(data.id);
        const fetchResponse = await fetch(`/api/shopify/${tabId}/get`);
        if (!fetchResponse.ok) {
           throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }
        const fetchData: TabReply = await fetchResponse.json();
        setDefinitions(fetchData.definitions);
        setValidations(fetchData.validations);
      } else {
        throw new Error(data.message || 'Failed to create new definition.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsAdding(false);
    }
  }, [selected, tabs]);

  const handleDeleteDefinition = useCallback(async () => {
    if (!selectedDefinition) {
      return;
    }
    setLoadingDefinition(true);
    setDefinitionError(null);
    const id = selectedDefinition.replace("gid://shopify/Metaobject/", "");
    const url = `/api/shopify/metaobject/delete/${id}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: { success: boolean, message: string } = await response.json();
      if (data.success) {
        setSelectedDefinition(null);
        const tabId = tabs[selected].id;
        const fetchResponse = await fetch(`/api/shopify/${tabId}/get`);
        if (!fetchResponse.ok) {
           throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }
        const fetchData: TabReply = await fetchResponse.json();
        setDefinitions(fetchData.definitions);
        setValidations(fetchData.validations);
        setEditedValidations(fetchData.validations);
      } else {
        setDefinitionError(data.message || 'Failed to delete definition.');
      }
    } catch (e: any) {
      setDefinitionError(e.message);
    } finally {
      setLoadingDefinition(false);
    }
  }, [selectedDefinition, selected, tabs]);

  useEffect(() => {
    const fetchDefinitions = async () => {
      setLoading(true);
      setError(null);
      setDefinitions(null);
      setValidations(null);
      setEditedValidations(null);
      setSelectedDefinition(null);
      
      const tabId = tabs[selected].id;
      const url = `/api/shopify/${tabId}/get`;

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: TabReply = await response.json();
        setDefinitions(data.definitions);
        setValidations(data.validations);
        setEditedValidations(data.validations);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDefinitions();
  }, [selected]);
  
  useEffect(() => {
    const fetchDefinitionDetails = async () => {
      if (!selectedDefinition) {
        setSelectedDefinitionData(null);
        setEditedDefinitionData(null);
        return;
      }
      setLoadingDefinition(true);
      setDefinitionError(null);
      
      const id = selectedDefinition.replace("gid://shopify/Metaobject/", "");
      const url = `/api/shopify/metaobject/get/${id}`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: DefinitionReply = await response.json();
        const updatedData = {
          ...data,
          fields: data.fields.map(field => {
            if (field.type.startsWith('list.')) {
              return { ...field, value: field.value ? JSON.parse(field.value) : [] };
            } else if (field.type === 'money') {
              return { ...field, value: field.value ? JSON.parse(field.value) : { amount: '', currency_code: 'USD' } };
            } else if (field.type === 'boolean') {
              return { ...field, value: field.value === 'true' };
            } else {
              return field;
            }
          })
        };

        setSelectedDefinitionData(updatedData);
        setEditedDefinitionData(updatedData);
        const validationsField = data.fields.find(field => field.key === 'validations');
        if (validationsField && validationsField.value) {
          const parsedValidations = JSON.parse(validationsField.value);
          setValidations(parsedValidations);
          setEditedValidations(parsedValidations);
        } else {
          setValidations([]);
          setEditedValidations([]);
        }
      } catch (e: any) {
        setDefinitionError(e.message);
      } finally {
        setLoadingDefinition(false);
      }
    };

    fetchDefinitionDetails();
  }, [selectedDefinition]);


  const backAction = {
    content: 'SAP Sync',
    url: '/app'
  };
  
  const handleFieldChange = useCallback(
    (key: string, newValue: any, type: string, newUrl?: string) => {
      if (editedDefinitionData) {
        const updatedFields = editedDefinitionData.fields.map(field => {
          if (field.key === key) {
            let valueToUpdate = newValue;
            if (type === 'money') {
              valueToUpdate = { amount: newValue, currency_code: 'USD' };
            } else if (type.startsWith('list.')) {
              return { ...field, value: newValue };
            } else if (type === 'boolean') {
              valueToUpdate = String(newValue);
            }
            return { ...field, value: valueToUpdate, url: newUrl };
          }
          return field;
        });
        setEditedDefinitionData({ ...editedDefinitionData, fields: updatedFields });
      }
    },
    [editedDefinitionData],
  );

  const handleDropZoneDrop = useCallback(
    async (files: File[], key: string, type: string) => {
      if (files.length > 0) {
        setLoadingDefinition(true);
        const file = files[0];
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/shopify/media/create', {
            method: 'POST',
            body: formData,
          });
          const data: { success: boolean; url: string | null; id: string | null } = await response.json();
          if (data.success && data.url && data.id) {
            handleFieldChange(key, data.id, type, data.url);
          } else {
            setDefinitionError('Failed to upload file.');
          }
        } catch (e: any) {
          setDefinitionError(e.message);
        } finally {
          setLoadingDefinition(false);
        }
      }
    },
    [handleFieldChange]
  );
  
  const handleSave = useCallback(async () => {
    const tabId = tabs[selected].id;
    if (tabId === 'recipient' || tabId === 'tone' || tabId === 'occasionName') {
      const formData = new FormData();
      formData.append('validations', JSON.stringify(editedValidations));
      
      const url = `/api/shopify/${tabId}/update`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (data.status === 'success') {
          console.log("Save successful!");
          setValidations(editedValidations);
        } else {
          console.error("Save failed:", data.message);
        }
      } catch (e) {
        console.error("An error occurred during save:", e);
      }
    } else {
      if (selectedDefinition && editedDefinitionData) {
        const id = selectedDefinition.replace("gid://shopify/Metaobject/", "");
        const url = `/api/shopify/metaobject/upsert/${id}`;
        
        const fieldsToSave = editedDefinitionData.fields.map(field => {
          if (field.type.startsWith('list.') || field.type === 'money') {
            return { ...field, value: JSON.stringify(field.value) };
          }
          return field;
        });
        
        const formData = new FormData();
        formData.append('fields', JSON.stringify(fieldsToSave));

        try {
          const response = await fetch(url, {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          if (data.status === "success") {
            console.log("Save successful!");
            setSelectedDefinitionData(editedDefinitionData);
          } else {
            console.error("Save failed:", data.message);
          }
        } catch (e) {
          console.error("An error occurred during save:", e);
        }
      }
    }
  }, [selected, editedValidations, editedDefinitionData, selectedDefinition, tabs]);

  const handleValidationChange = useCallback(
    (newValue: string, index: number) => {
      if (editedValidations) {
        const newValidations = [...editedValidations];
        newValidations[index] = newValue;
        setEditedValidations(newValidations);
      }
    },
    [editedValidations],
  );
  
  const handleDeleteListItem = useCallback(
    (fieldKey: string, index: number) => {
      if (editedDefinitionData) {
        const updatedFields = editedDefinitionData.fields.map(field => {
          if (field.key === fieldKey && Array.isArray(field.value)) {
            const newList = field.value.filter((_, i) => i !== index);
            return { ...field, value: newList };
          }
          return field;
        });
        setEditedDefinitionData({ ...editedDefinitionData, fields: updatedFields });
      }
    },
    [editedDefinitionData],
  );

  const handleMoveUpListItem = useCallback(
    (fieldKey: string, index: number) => {
      if (editedDefinitionData && index > 0) {
        const updatedFields = editedDefinitionData.fields.map(field => {
          if (field.key === fieldKey && Array.isArray(field.value)) {
            const newList = [...field.value];
            [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
            return { ...field, value: newList };
          }
          return field;
        });
        setEditedDefinitionData({ ...editedDefinitionData, fields: updatedFields });
      }
    },
    [editedDefinitionData],
  );
  
  const handleMoveDownListItem = useCallback(
    (fieldKey: string, index: number, listValueLength: number) => {
      if (editedDefinitionData && index < listValueLength - 1) {
        const updatedFields = editedDefinitionData.fields.map(field => {
          if (field.key === fieldKey && Array.isArray(field.value)) {
            const newList = [...field.value];
            [newList[index + 1], newList[index]] = [newList[index], newList[index + 1]];
            return { ...field, value: newList };
          }
          return field;
        });
        setEditedDefinitionData({ ...editedDefinitionData, fields: updatedFields });
      }
    },
    [editedDefinitionData],
  );

  const handleDeleteValidation = useCallback(
    (index: number) => {
      if (editedValidations && editedValidations.length > 1) {
        const newValidations = editedValidations.filter((_, i) => i !== index);
        setEditedValidations(newValidations);
      }
    },
    [editedValidations],
  );

  const handleMoveUpValidation = useCallback(
    (index: number) => {
      if (editedValidations && index > 0) {
        const newValidations = [...editedValidations];
        [newValidations[index - 1], newValidations[index]] = [newValidations[index], newValidations[index + 1]];
        setEditedValidations(newValidations);
      }
    },
    [editedValidations],
  );

  const handleMoveDownValidation = useCallback(
    (index: number) => {
      if (editedValidations && index < editedValidations.length - 1) {
        const newValidations = [...editedValidations];
        [newValidations[index + 1], newValidations[index]] = [newValidations[index], newValidations[index + 1]];
        setEditedValidations(newValidations);
      }
    },
    [editedValidations],
  );
  
  const handleAddNewValidation = useCallback(() => {
    if (editedValidations) {
      setEditedValidations([...editedValidations, '']);
    }
  }, [editedValidations]);

  const areValidationsUnchanged = useMemo(() => {
    return JSON.stringify(editedValidations) === JSON.stringify(validations);
  }, [editedValidations, validations]);
  
  const areFieldsUnchanged = useMemo(() => {
    return JSON.stringify(editedDefinitionData?.fields) === JSON.stringify(selectedDefinitionData?.fields);
  }, [editedDefinitionData, selectedDefinitionData]);

  const handleCancel = useCallback(() => {
    setEditedValidations(validations);
    setEditedDefinitionData(selectedDefinitionData);
  }, [validations, selectedDefinitionData]);


  const allFilteredDefinitions = useMemo(() => {
    if (!definitions) {
      return [];
    }
    return definitions.filter(definition => {
      const nameMatch = definition.name.toLowerCase().includes(queryValue.toLowerCase());
      const statusMatch = status?.[0] === 'ALL' || (status?.[0] === 'DEFINED' ? definition.defined : !definition.defined);
      return nameMatch && statusMatch;
    });
  }, [definitions, queryValue, status]);

  const paginatedDefinitions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allFilteredDefinitions.slice(startIndex, endIndex);
  }, [allFilteredDefinitions, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(allFilteredDefinitions.length / itemsPerPage);
  }, [allFilteredDefinitions, itemsPerPage]);
  
  const filters = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      filter: (
        <ChoiceList
          title="Status"
          titleHidden
          choices={[
            {label: 'ALL', value: 'ALL'},
            {label: 'DEFINED', value: 'DEFINED'},
            {label: 'UNDEFINED', value: 'UNDEFINED'},
          ]}
          selected={status || ['ALL']}
          onChange={handleStatusChange}
        />
      ),
      shortcut: true,
    },
  ], [status, handleStatusChange]);

  const appliedFilters = useMemo(() => {
    const filters = [];
    if (status && status[0] !== 'ALL') {
      filters.push({
        key: 'status',
        label: `Status: ${status[0]}`,
        onRemove: () => setStatus(['ALL']),
      });
    }
    return filters;
  }, [status]);

  const renderContent = () => {
    if (loading) {
      return (
        <LegacyStack distribution="center">
          <Spinner accessibilityLabel="Loading definitions" size="large" />
        </LegacyStack>
      );
    }

    if (error) {
      return <Text as="p" variant="headingSm" tone="critical">Error: {error}</Text>;
    }
    
    const hasDefinitions = paginatedDefinitions && paginatedDefinitions.length > 0;
    const hasValidationsWithoutDefinitions = validations && validations.length > 0 && !hasDefinitions;

    return (
      <Layout>
        <Layout.Section variant="oneThird">
          <Card padding="0">
              <ResourceList
                items={paginatedDefinitions}
                renderItem={(item: any) => {
                  const {id, name, defined} = item;
                  return (
                    <ResourceItem
                      id={id}
                      accessibilityLabel={`View details for ${name}`}
                      name={name}
                      onClick={() => setSelectedDefinition(id)}
                      disabled={selectedDefinition === id}
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
                filterControl={
                  <BlockStack gap="100">
                    <InlineStack direction="row-reverse">
                        <Button variant={"primary"} onClick={() => handleAdd()}>Add New</Button>
                    </InlineStack>
                    <Filters
                      queryValue={queryValue}
                      onQueryChange={handleQueryChange}
                      onQueryClear={handleQueryClear}
                      filters={filters}
                      appliedFilters={appliedFilters}
                      onClearAll={() => {
                        setQueryValue('');
                        setStatus(['ALL']);
                      }}
                    />
                  </BlockStack>
                }
              />
            {totalPages > 1 && (
              <Box padding="400">
                <LegacyStack distribution="center">
                  <Pagination
                    hasPrevious={currentPage > 1}
                    onPrevious={() => setCurrentPage(prev => prev - 1)}
                    hasNext={currentPage < totalPages}
                    onNext={() => setCurrentPage(prev => prev + 1)}
                  />
                </LegacyStack>
              </Box>
            )}
          </Card>
        </Layout.Section>
        <Layout.Section>
          {(selectedDefinition || hasValidationsWithoutDefinitions) && (
            <Card>
                  <BlockStack gap="400">
                    <InlineGrid gap="400" columns={['twoThirds', 'oneThird']} alignItems="center">
                      <Text variant="headingLg" as="h2">
                        {selectedDefinitionData?.name || tabs[selected].content}
                      </Text>
                      <InlineStack direction="row-reverse">
                        <ButtonGroup>
                            <Button onClick={handleCancel} disabled={areValidationsUnchanged && areFieldsUnchanged}>Cancel</Button>
                            {selectedDefinitionData && (
                              <Button onClick={handleDeleteDefinition} disabled={selectedDefinitionData.isUsed === true} tone="critical" variant="primary">Delete</Button>
                            )}
                            <Button onClick={handleSave} disabled={areValidationsUnchanged && areFieldsUnchanged} variant="primary">Save</Button>
                        </ButtonGroup>
                      </InlineStack>
                    </InlineGrid>
                    {loadingDefinition ? (
                      <LegacyStack distribution="center">
                        <Spinner accessibilityLabel="Loading definition details" size="large" />
                      </LegacyStack>
                    ) : definitionError ? (
                      <Text as="p" variant="headingSm" tone="critical">Error: {definitionError}</Text>
                    ) : editedDefinitionData && (
                      editedDefinitionData.fields.map(field => {
                        if (field.options && field.options.length > 0) {
                            if (field.type.startsWith("list.")) {
                                return (
                                    <ChoiceList 
                                        key={field.key}
                                        allowMultiple
                                        title={field.name}
                                        choices={field.options}
                                        selected={field.value || []}
                                        onChange={(newValue: string[]) => handleFieldChange(field.key, newValue, field.type)}
                                    />
                                );
                            } else {
                                return (
                                    <Select
                                        key={field.key}
                                        label={field.name}
                                        options={field.options}
                                        value={field.value}
                                        onChange={(newValue: string) => handleFieldChange(field.key, newValue, field.type)}
                                    />
                                );
                            }
                        } else {
                            if (field.type === "single_line_text_field") {
                                return (
                                    <TextField 
                                        key={field.key}
                                        label={field.name}
                                        value={field.value}
                                        onChange={(newValue: string) => handleFieldChange(field.key, newValue, field.type)}
                                        autoComplete="off"
                                    />
                                );
                            } else if (field.type === "list.single_line_text_field") {
                                const listValue = Array.isArray(field.value) ? field.value : [];
                                return (
                                    <Box key={field.key} borderColor="border" borderWidth="025" borderRadius="150" padding="100">
                                        <BlockStack gap="300">
                                            <Text as="p" variant="bodyMd" >{field.name}</Text>
                                            {listValue.map((listItem: string, index: number) => (
                                              <InlineGrid key={index} gap="200" columns={['twoThirds', 'oneThird']}>
                                                <TextField 
                                                    label={listItem}
                                                    labelHidden
                                                    key={`${field.key}-${index}`}
                                                    value={listItem}
                                                    onChange={(newValue: string) => {
                                                    const newList = [...listValue];
                                                    newList[index] = newValue;
                                                    handleFieldChange(field.key, newList, field.type);
                                                    }}
                                                    autoComplete="off"
                                                />
                                                <InlineGrid gap="200" columns={3}>
                                                    <Button 
                                                        icon={ChevronUpIcon}
                                                        onClick={() => handleMoveUpListItem(field.key, index)}
                                                        disabled={index === 0}
                                                    />
                                                    <Button 
                                                        icon={ChevronDownIcon}
                                                        onClick={() => handleMoveDownListItem(field.key, index, listValue.length)}
                                                        disabled={index === listValue.length - 1}
                                                    />
                                                    <Button 
                                                        variant="primary" 
                                                        tone="critical" 
                                                        icon={DeleteIcon}
                                                        onClick={() => handleDeleteListItem(field.key, index)}
                                                    />
                                                </InlineGrid>
                                              </InlineGrid>
                                            ))}
                                            <Button onClick={() => {
                                              const updatedList = [...(Array.isArray(field.value) ? field.value : []), ""];
                                              handleFieldChange(field.key, updatedList, field.type);
                                            }} variant='primary'>Add Item</Button>
                                        </BlockStack>
                                    </Box>
                                );
                            } else if (field.type === "multi_line_text_field") {
                                return (
                                    <TextField 
                                        key={field.key}
                                        label={field.name}
                                        value={field.value || ""}
                                        onChange={(newValue: string) => handleFieldChange(field.key, newValue, field.type)}
                                        autoComplete="off"
                                        multiline={4}
                                    />
                                );
                            } else if (field.type === "file_reference") {
                                const fileUpload = !field.value && <DropZone.FileUpload />;
                                const uploadedFile = field.value && (
                                    <Box padding="200">
                                        <BlockStack gap="150" inlineAlign="center">
                                            <Thumbnail
                                                size="large"
                                                alt={field.name}
                                                source={field.url as string}
                                            />
                                            <Button onClick={() => handleFieldChange(field.key, '', field.type)} tone="critical">Remove</Button>
                                        </BlockStack>
                                    </Box>
                                );
                                
                                return (
                                    <DropZone
                                        key={field.key}
                                        label={field.name}
                                        onDrop={(files) => handleDropZoneDrop(files, field.key, field.type)}
                                        accept="image/*"
                                        type="image"
                                        allowMultiple={false}
                                    >
                                        {uploadedFile}
                                        {fileUpload}
                                    </DropZone>
                                );
                            } else if (field.type === "boolean") {
                                return (
                                    <ChoiceList 
                                        key={field.key}
                                        title={field.name}
                                        choices={[
                                            { label: "Yes", value: "true" },
                                            { label: "No", value: "false" }
                                        ]}
                                        selected={[field.value ? "true" : "false"]}
                                        onChange={(newValue: string[]) => handleFieldChange(field.key, newValue[0] === "true", field.type)}
                                    />
                                );
                            } else if (field.type === "money") {
                                return (
                                    <TextField 
                                        key={field.key}
                                        label={field.name}
                                        value={field.value?.amount || ""}
                                        onChange={(newValue: string) => handleFieldChange(field.key, newValue, field.type)}
                                        autoComplete="off"
                                        type="currency"
                                        prefix="$"
                                    />
                                );
                            } else if (field.type === "number_integer") {
                                return (
                                    <TextField 
                                        key={field.key}
                                        label={field.name}
                                        value={field.value?.toString() || ""}
                                        onChange={(newValue: string) => handleFieldChange(field.key, newValue, field.type)}
                                        autoComplete="off"
                                        type="number"
                                    />
                                );
                            }
                        }
                      })
                    )}
                    {editedValidations && editedValidations.length > 0 && (
                        <>
                            {editedValidations.map((val: string, index: number) => (
                                <InlineGrid key={index} gap="200" columns={['twoThirds', 'oneThird']}>
                                    <TextField
                                    label={val}
                                    labelHidden
                                    value={editedValidations[index]}
                                    onChange={(newValue: any) => handleValidationChange(newValue, index)}
                                    autoComplete="off"
                                    />
                                    <InlineGrid gap="200" columns={3}>
                                        <Button 
                                            onClick={() => handleMoveUpValidation(index)}
                                            icon={ChevronUpIcon} 
                                            disabled={index === 0}
                                        />
                                        <Button 
                                            onClick={() => handleMoveDownValidation(index)}
                                            icon={ChevronDownIcon} 
                                            disabled={index === editedValidations.length - 1}
                                        />
                                        <Button 
                                            onClick={() => handleDeleteValidation(index)} 
                                            variant="primary" 
                                            tone="critical" 
                                            icon={DeleteIcon} 
                                            disabled={editedValidations.length <= 1}
                                        />
                                    </InlineGrid>
                                </InlineGrid>
                            ))}
                            <Button onClick={handleAddNewValidation} variant="primary" fullWidth>
                                {`Add New ${tabs[selected].content}`}
                            </Button>
                        </>
                    )}
                  </BlockStack>
            </Card>
          )}
        </Layout.Section>
      </Layout>
    );
  };

  return (
    <Page 
      fullWidth
      title="Product Definitions"
      backAction={backAction}
    >
      <BlockStack gap="500">
        <Tabs tabs={tabs} selected={selected} onSelect={handleTabChange} fitted />
        {renderContent()}
        <FooterHelp>
            For any questions or help please submit a ticket to the HelpDesk.
        </FooterHelp>
      </BlockStack>
    </Page>
  );
}
