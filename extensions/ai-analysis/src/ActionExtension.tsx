import {useCallback, useEffect, useState} from 'react';
import {
  reactExtension,
  useApi,
  AdminAction,
  BlockStack,
  Button,
  InlineStack,
  Heading,
  TextField,
  Checkbox,
  TextArea,
  Select,
  NumberField,
  ProgressIndicator,
  Banner,
  Text
} from '@shopify/ui-extensions-react/admin';

import { getProductData, updateProduct } from './utils';

const TARGET = 'admin.product-details.action.render';

export default reactExtension(TARGET, () => <App />);

interface Metafield {
  namespace: "custom";
  key: String;
  value: String;
}

interface productUpdate {
  id: String;
  description?: String;
  metafields?: Metafield[];
  seo?: {
    description: String;
  };
  title?: String;
}

function App() {
  const {close, data} = useApi(TARGET);

  const [submitStatus, setSubmitStatus] = useState(true);
  const [errorsList, setErrorsList] = useState([]);

  const productId = data.selected[0].id;

  const [aiGen, setAIGen] = useState(null);
  const [importProduct, setImportProduct] = useState(null);
  const [toneOptions, setToneOptions] = useState([]);
  const [recipentOptions, setRecipentOptions] = useState([]);

  const [description, setDescription] = useState("");
  const [descriptionOverride, setDescriptionOverride] = useState(false);
  const [descriptionChange, setDescriptionChange] = useState(false);
  const onDescriptionOverrideChange = useCallback((input) => {
    setDescriptionOverride(input);
    if (!input && aiGen) {
      setDescription(aiGen.description);
    }
  }, [aiGen]);
  const handleDescriptionChange = useCallback((input) => {
    setDescription(input);
    if (input != importProduct.description) {
      setDescriptionChange(true);
    } else {
      setDescriptionChange(false);
    }
  }, [importProduct]);

  const [languageLevel, setLanguageLevel] = useState(0);
  const [languageLevelOverride, setLanguageLevelOverride] = useState(false);
  const [languageChange, setLanguageChange] = useState(false);
  const onLanguageOverrideChange = useCallback((input) => {
    setLanguageLevelOverride(input);
    if (!input && aiGen) {
      setLanguageLevel(aiGen.languageLevel);
    }
  }, [aiGen]);
  const handleLanguageChange = useCallback((input) => {
    setLanguageLevel(input);
    if (input != importProduct.languageLevel) {
      setLanguageChange(true);
    } else {
      setLanguageChange(false);
    }
  }, [importProduct]);

  const [nudityLevel, setNudityLevel] = useState(0);
  const [nudityLevelOverride, setNudityLevelOverride] = useState(false);
  const [nudityChange, setNudityChange] = useState(false);
  const onNudityOverrideChange = useCallback((input) => {
    setNudityLevelOverride(input);
    if (!input && aiGen) {
      setNudityLevel(aiGen.nudityLevel);
    }
  }, [aiGen]);
  const handleNudityChange = useCallback((input) => {
    setNudityLevel(input);
    if (input != importProduct.nudityLevel) {
      setNudityChange(true);
    } else {
      setNudityChange(false);
    }
  }, [importProduct]);

  const [politicalLevel, setPoliticalLevel] = useState(0);
  const [politicalLevelOverride, setPoliticalLevelOverride] = useState(false);
  const [politicalChange, setPoliticalChange] = useState(false);
  const onPoliticalOverrideChange = useCallback((input) => {
    setPoliticalLevelOverride(input);
    if (!input && aiGen) {
      setPoliticalLevel(aiGen.politicalLevel);
    }
  }, [aiGen]);
  const handlePoliticalChange = useCallback((input) => {
    setPoliticalLevel(input);
    if (input != importProduct.politicalLevel) {
      setPoliticalChange(true);
    } else {
      setPoliticalChange(false);
    }
  }, [importProduct]);

  const [recipent, setRecipent] = useState("");
  const [recipentOverride, setRecipentOverride] = useState(false);
  const [recipentChange, setRecipentChange] = useState(false);
  const onRecipientOverrideChange = useCallback((input) => {
    setRecipentOverride(input);
    if (!input && aiGen) {
      setRecipent(aiGen.recipent);
    }
  }, [aiGen]);
  const handleRecipentChange = useCallback((input) => {
    setRecipent(input);
    if (input != importProduct.recipent) {
      setRecipentChange(true);
    } else {
      setRecipentChange(false);
    }
  }, [importProduct]);

  const [seoDescription, setSEODescription] = useState("");
  const [seoDescriptionOverride, setSEODescriptionOverride] = useState(false);
  const [seoDescriptionChange, setSEODescriptionChange] = useState(false);
  const onSEODescriptionOverrideChange = useCallback((input) => {
    setSEODescriptionOverride(input);
    if (!input && aiGen) {
      setSEODescription(aiGen.seoDescription);
    }
  }, [aiGen]);
  const handleSEODescriptionChange = useCallback((input) => {
    setSEODescription(input);
    if (input != importProduct.seoDescription) {
      setSEODescriptionChange(true);
    } else {
      setSEODescriptionChange(false);
    }
  }, [importProduct]);

  const [sexualLevel, setSexualLevel] = useState(0);
  const [sexualLevelOverride, setSexualLevelOverride] = useState(false);
  const [sexualLevelChange, setSexualLevelChange] = useState(false);
  const onSexualOverrideChange = useCallback((input) => {
    setSexualLevelOverride(input);
    if (!input && aiGen) {
      setSexualLevel(aiGen.sexualLevel);
    }
  }, [aiGen]);
  const handleSexualChange = useCallback((input) => {
    setSexualLevel(input);
    if (input != importProduct.sexualLevel) {
      setSexualLevelChange(true);
    } else {
      setSexualLevelChange(false);
    }
  }, [importProduct]);

  const [title, setTitle] = useState("");
  const [titleOverride, setTitleOverride] = useState(false);
  const [titleChange, setTitleChange] = useState(false);
  const onTitleOverrideChange = useCallback((input) => {
    setTitleOverride(input);
    if (!input && aiGen) {
      setTitle(aiGen.title);
    }
  }, [aiGen]);
  const handleTitleChange = useCallback((input) => {
    setTitle(input);
    if (input != importProduct.title) {
      setTitleChange(true);
    } else {
      setTitleChange(false);
    }
  }, [importProduct]);

  const [tone, setTone] = useState("");
  const [toneOverride, setToneOverride] = useState(false);
  const [toneChange, setToneChange] = useState(false);
  const onToneOverrideChange = useCallback((input) => {
    setToneOverride(input);
    if (!input && aiGen) {
      setTone(aiGen.tone);
    }
  }, [aiGen]);
  const handleToneChange = useCallback((input) => {
    setTone(input);
    if (input != importProduct.tone) {
      setToneChange(true);
    } else {
      setToneChange(false);
    }
  }, [importProduct]);

  const [altTextList, setAltTextList] = useState([]);
  const [altTextOverrideList, setAltTextOverrideList] = useState([]);
  const [altTextChange, setAltTextChange] = useState(false);
  const onAltTextOverrideChange = useCallback((input, index) => {
    setAltTextOverrideList(altTextOverrideList.map((item, i) => (i === index ? input : item)));
    if (!input && aiGen) {
      setAltTextList(altTextList.map((item, i) => {
        if (i === index) {
          return {
            id: item.id,
            alt: aiGen.altText[index]
          }
        } else {
          return item;
        }
      }));
    }
  }, [altTextOverrideList, aiGen, altTextList]);
  const handleAltTextChange = useCallback((input, index) => {
    setAltTextList(altTextList.map((item, i) => {
      if (i === index ) {
        return {
          id: item.id,
          alt: input
        }
      } else {
        return item
      }
    }));
    setAltTextChange(false);
    altTextList.forEach((item, i) => {
      if (item.alt != importProduct.altText[i].alt) {
        setAltTextChange(true);
      }
    });
  }, [altTextList, importProduct]);

  useEffect(() => {
    (async function getProductInfo(){
      const productData = await getProductData(productId);

      setAIGen(productData.json);
      setImportProduct(productData);

      if (productData.toneList) {
        setToneOptions([{
          value: null,
          label: ""
        }, ...productData.toneList.map((option) => ({
          value: option,
          label: option
        }))]);
      }
      if (productData.recipentList) {
        setRecipentOptions([{
          value: null,
          label: ""
        }, ...productData.recipentList.map((option) => ({
          value: option.id,
          label: option.name
        }))]);
      }

      if (productData.description) {
        setDescription(productData.description);
        if (aiGen && description != aiGen.description) {
          setDescriptionOverride(true);
        }
      }

      if (productData.languageLevel) {
        setLanguageLevel(productData.languageLevel);
        if (aiGen && languageLevel != aiGen.languageLevel) {
          setLanguageLevelOverride(true);
        }
      }

      if (productData.nudityLevel) {
        setNudityLevel(productData.nudityLevel);
        if (aiGen && nudityLevel != aiGen.nudityLevel) {
          setNudityLevelOverride(true);
        }
      }

      if (productData.politicalLevel) {
        setPoliticalLevel(productData.politicalLevel);
        if (aiGen && politicalLevel != aiGen.politicalLevel) {
          setPoliticalLevelOverride(true);
        }
      }

      if (productData.recipent) {
        setRecipent(productData.recipent);
        if (aiGen && recipent != aiGen.recipent) {
          setRecipentOverride(true);
        }
      }

      if (productData.seoDescription) {
        setSEODescription(productData.seoDescription);
        if (aiGen && seoDescription != aiGen.seoDescription) {
          setSEODescriptionOverride(true);
        }
      }

      if (productData.sexualLevel) {
        setSexualLevel(productData.sexualLevel);
        if (aiGen && sexualLevel != aiGen.sexualLevel) {
          setSexualLevelOverride(true);
        }
      }

      if (productData.title) {
        setTitle(productData.title);
        if (aiGen && title != aiGen.title) {
          setTitleOverride(true);
        }
      }

      if (productData.tone) {
        setTone(productData.tone);
        if (aiGen && tone != aiGen.tone) {
          setToneOverride(true);
        }
      }

      if (productData.altText.length > 0) {
        setAltTextList(productData.altText);
        const tempAltTextArray = [];
        for (let i = 0; i < productData.altText.length; i++) {
          tempAltTextArray.push(false);
        }
        setAltTextOverrideList(altTextOverrideList.concat(tempAltTextArray));
      }
    })();
  }, []);

  const onSave = useCallback(async () => {
    setSubmitStatus(false);
    setErrorsList([]);

    const product: productUpdate = {
      id: data.selected[0].id
    };

    if (descriptionChange) {
      product.description = description;
    }

    if (languageChange) {
      product.metafields.push({
        namespace: "custom",
        key: "foulLanguage",
        value: languageLevel.toString()
      });
    }

    if (nudityChange) {
      product.metafields.push({
        namespace: "custom",
        key: "nuditylevel",
        value: nudityLevel.toString()
      });
    }

    if (politicalChange) {
      product.metafields.push({
        namespace: "custom",
        key: "politicallevel",
        value: politicalLevel.toString()
      });
    }

    if (recipentChange) {
      product.metafields.push({
        namespace: "custom",
        key: "recipient",
        value: recipent
      });
    }

    if (seoDescriptionChange) {
      product.seo.description = seoDescription;
    }

    if (sexualLevelChange) {
      product.metafields.push({
        namespace: "custom",
        key: "sexuallevel",
        value: sexualLevel.toString()
      });
    }

    if (titleChange) {
      product.title = title;
    }

    if (toneChange) {
      product.metafields.push({
        namespace: "custom",
        key: "tone",
        value: tone
      });
    }

    const media = [];

    if (altTextChange) {
      altTextList.forEach((altText, index) => {
        if (altText.alt != importProduct[index].alt) {
          media.push({
            id: altText.id,
            alt: altText.alt
          });
        }
      })
    }

    const returnedData = await updateProduct(product, media);

    if (returnedData[0].code === "SUCCESS") {
      close();
    }

    setErrorsList(returnedData);

    setSubmitStatus(true);
  }, [descriptionChange, description, languageChange, languageLevel, nudityChange, nudityLevel, politicalChange, politicalLevel, recipentChange, recipent, seoDescriptionChange, seoDescription, sexualLevelChange, sexualLevel, titleChange, title, toneChange, tone, altTextChange, altTextList, importProduct])

  return (
    <AdminAction
      primaryAction={
        <Button
          onPress={onSave}
          disabled={!(descriptionChange || languageChange || nudityChange || politicalChange || recipentChange || seoDescriptionChange || sexualLevelChange || titleChange || toneChange || altTextChange)}
        >
          Save
        </Button>
      }
      secondaryAction={
        <Button
          onPress={() => {
            close();
          }}
        >
          Cancel
        </Button>
      }
    >
      <BlockStack gap>
        {submitStatus ?
          <>
            {errorsList.length > 0 ?
              <>
                {errorsList.map(error => (
                  <Banner tone='critical' title='ERROR'>
                    <Text>[{error.code}] {error.message}</Text>
                  </Banner>
                ))}
              </>
            :
              null
            }
            <InlineStack>
              <Checkbox value={titleOverride} onChange={() => onTitleOverrideChange(!titleOverride)} />
              <TextField label="Title" disabled={!titleOverride} value={title} onChange={(value) => handleTitleChange(value)} />
            </InlineStack>
            <InlineStack>
              <Checkbox value={seoDescriptionOverride} onChange={() => onSEODescriptionOverrideChange(!seoDescriptionOverride)} />
              <TextArea label="Meta Description" disabled={!seoDescriptionOverride} value={seoDescription} onChange={(value) => handleSEODescriptionChange(value)} />
            </InlineStack>
            <InlineStack>
              <Checkbox value={descriptionOverride} onChange={() => onDescriptionOverrideChange(!descriptionOverride)} />
              <TextArea label="Description" disabled={!descriptionOverride} value={description} onChange={(value) => handleDescriptionChange(value)} />
            </InlineStack>
            <Heading size={5}>Crude Rankings</Heading>
              <InlineStack gap>
                <InlineStack>
                  <Checkbox value={nudityLevelOverride} onChange={() => onNudityOverrideChange(!nudityLevelOverride)} />
                  <NumberField label="Nudity Level" min={1} max={5} disabled={!nudityLevelOverride} value={nudityLevel} onChange={(value) => handleNudityChange(value)} />
                </InlineStack>
                <InlineStack>
                  <Checkbox value={politicalLevelOverride} onChange={() => onPoliticalOverrideChange(!politicalLevelOverride)} />
                  <NumberField label="Political Level" min={1} max={5} disabled={!politicalLevelOverride} value={politicalLevel} onChange={(value) => handlePoliticalChange(value)} />
                </InlineStack>
                <InlineStack>
                  <Checkbox value={sexualLevelOverride} onChange={() => onSexualOverrideChange(!sexualLevelOverride)} />
                  <NumberField label="Sexual Level" min={1} max={5} disabled={!sexualLevelOverride} value={sexualLevel} onChange={(value) => handleSexualChange(value)} />
                </InlineStack>
                <InlineStack>
                  <Checkbox value={languageLevelOverride} onChange={() => onLanguageOverrideChange(!languageLevelOverride)} />
                  <NumberField label="Language Level" min={1} max={5} disabled={!languageLevelOverride} value={languageLevel} onChange={(value) => handleLanguageChange(value)} />
                </InlineStack>
              </InlineStack>
            <Heading size={5}>Meta Data</Heading>
            <InlineStack gap>
              <InlineStack>
                <Checkbox value={toneOverride} onChange={() => onToneOverrideChange(!toneOverride)} />
                <Select label="Tone" disabled={!toneOverride} value={tone} onChange={(value) => handleToneChange(value)} options={toneOptions} />
              </InlineStack>
              <InlineStack>
                <Checkbox value={recipentOverride} onChange={() => onRecipientOverrideChange(!recipentOverride)} />
                <Select label="Recipent" disabled={!recipentOverride} value={recipent} onChange={(value) => handleRecipentChange(value)} options={recipentOptions} />
              </InlineStack>
            </InlineStack>
            <Heading size={5}>Alt Texts</Heading>
            {altTextList.map((altText, index) => (
              <InlineStack>
                <Checkbox value={altTextOverrideList[index]} onChange={() => onAltTextOverrideChange(!altTextOverrideList[index], index)} />
                <TextArea label={`Alt Text Image ${index + 1}`} disabled={!altTextOverrideList[index]} value={altText.alt} onChange={(value) => handleAltTextChange(value, index)} />
              </InlineStack>
            ))}
          </>
        :
          <ProgressIndicator size="small-200" />
        }
      </BlockStack>
    </AdminAction>
  );
}