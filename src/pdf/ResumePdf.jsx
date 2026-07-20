import React from 'react';
import {
Document,
Page,
Text,
View,
StyleSheet,
} from '@react-pdf/renderer';

const ACCENTS = {
minimal: '#4b5563',
modern: '#6c5ce7',
bold: '#ff7a59',
classic: '#2f6fb0',
};

const styles = StyleSheet.create({
page: {
paddingTop: 32,
paddingBottom: 34,
paddingHorizontal: 28,
fontSize: 11,
fontFamily: 'Helvetica',
color: '#111827',
backgroundColor: '#FFFFFF',
},

header: {
flexDirection: 'row',
alignItems: 'center',
borderBottomWidth: 2,
borderBottomColor: '#4b5563',
paddingBottom: 12,
marginBottom: 14,
},

avatar: {
width: 42,
height: 42,
borderRadius: 21,
alignItems: 'center',
justifyContent: 'center',
marginRight: 12,
},

avatarText: {
color: '#FFFFFF',
fontSize: 13,
fontWeight: 700,
},

nameWrap: {
flex: 1,
},

fullName: {
fontSize: 20,
fontWeight: 700,
marginBottom: 2,
},

role: {
fontSize: 11,
fontWeight: 600,
},

contacts: {
flexDirection: 'row',
flexWrap: 'wrap',
rowGap: 4,
columnGap: 12,
marginBottom: 14,
},

contact: {
fontSize: 10,
color: '#6B7280',
},

section: {
marginBottom: 14,
},

sectionTitle: {
fontSize: 10,
fontWeight: 700,
textTransform: 'uppercase',
letterSpacing: 1,
marginBottom: 7,
},

paragraph: {
fontSize: 11,
lineHeight: 1.55,
color: '#374151',
},

item: {
marginBottom: 10,
},

rowBetween: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'baseline',
marginBottom: 2,
},

itemTitle: {
fontSize: 12,
fontWeight: 700,
flex: 1,
},

itemPeriod: {
fontSize: 9,
color: '#6B7280',
marginLeft: 8,
},

itemSubtitle: {
fontSize: 10,
color: '#6B7280',
marginBottom: 4,
},

itemDescription: {
fontSize: 10.5,
lineHeight: 1.5,
color: '#374151',
},

skillsWrap: {
flexDirection: 'row',
flexWrap: 'wrap',
rowGap: 6,
columnGap: 6,
},

skill: {
borderRadius: 12,
paddingHorizontal: 8,
paddingVertical: 4,
},

skillText: {
fontSize: 9.5,
fontWeight: 600,
},
});

function initials(name = '') {
return name
.split(/\s+/)
.slice(0, 2)
.map((w) => w?.[0]?.toUpperCase())
.join('');
}

function alpha(hex, opacity = '1A') {
return `${hex}${opacity}`;
}

export default function ResumePdf({ resume }) {
const accent = ACCENTS[resume?.template] || ACCENTS.minimal;

return ( <Document> <Page size="A4" style={styles.page}>
{/* HEADER */}
<View
style={[
styles.header,
{ borderBottomColor: accent },
]}
>
<View
style={[
styles.avatar,
{ backgroundColor: accent },
]}
> <Text style={styles.avatarText}>
{initials(resume?.fullName || '?')} </Text> </View>

```
      <View style={styles.nameWrap}>
        <Text style={styles.fullName}>
          {resume?.fullName || 'Ваше имя'}
        </Text>

        <Text
          style={[
            styles.role,
            { color: accent },
          ]}
        >
          {resume?.role || 'Должность'}
        </Text>
      </View>
    </View>

    {/* CONTACTS */}
    <View style={styles.contacts}>
      {resume?.email ? (
        <Text style={styles.contact}>{resume.email}</Text>
      ) : null}

      {resume?.phone ? (
        <Text style={styles.contact}>{resume.phone}</Text>
      ) : null}

      {resume?.city ? (
        <Text style={styles.contact}>{resume.city}</Text>
      ) : null}
    </View>

    {/* ABOUT */}
    {resume?.summary ? (
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { color: accent },
          ]}
        >
          О себе
        </Text>

        <Text style={styles.paragraph}>
          {resume.summary}
        </Text>
      </View>
    ) : null}

    {/* EXPERIENCE */}
    {(resume?.experience || []).length > 0 ? (
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { color: accent },
          ]}
        >
          Опыт работы
        </Text>

        {(resume.experience || []).map((e) => (
          <View key={e.id || `${e.company}-${e.position}`} style={styles.item}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>
                {e.position}
              </Text>

              {e.period ? (
                <Text style={styles.itemPeriod}>
                  {e.period}
                </Text>
              ) : null}
            </View>

            {e.company ? (
              <Text style={styles.itemSubtitle}>
                {e.company}
              </Text>
            ) : null}

            {e.description ? (
              <Text style={styles.itemDescription}>
                {e.description}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    ) : null}

    {/* EDUCATION */}
    {(resume?.education || []).length > 0 ? (
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { color: accent },
          ]}
        >
          Образование
        </Text>

        {(resume.education || []).map((e) => (
          <View key={e.id || `${e.school}-${e.degree}`} style={styles.item}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>
                {e.school}
              </Text>

              {e.period ? (
                <Text style={styles.itemPeriod}>
                  {e.period}
                </Text>
              ) : null}
            </View>

            {e.degree ? (
              <Text style={styles.itemSubtitle}>
                {e.degree}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    ) : null}

    {/* SKILLS */}
    {(resume?.skills || []).length > 0 ? (
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { color: accent },
          ]}
        >
          Навыки
        </Text>

        <View style={styles.skillsWrap}>
          {(resume.skills || []).map((s) => (
            <View
              key={s}
              style={[
                styles.skill,
                { backgroundColor: alpha(accent) },
              ]}
            >
              <Text
                style={[
                  styles.skillText,
                  { color: accent },
                ]}
              >
                {s}
              </Text>
            </View>
          ))}
        </View>
      </View>
    ) : null}
  </Page>
</Document>
```

);
}
