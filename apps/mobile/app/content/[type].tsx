import { useEffect, useState } from 'react';
import { ScrollView, View, Text, Image, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CONTENT_CATEGORIES } from '@fishmaster/shared-types';
import { API_URL } from '../../src/api';
import { colors } from '../../src/theme';

type Post = {
  id: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  createdAt: string;
  author: { name: string };
};

export default function ContentFeedScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const category = CONTENT_CATEGORIES.find((c) => c.type === type);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!type) return;
    fetch(`${API_URL}/api/content?type=${type}`)
      .then((r) => r.json())
      .then(setPosts)
      .catch(() => setPosts([]));
  }, [type]);

  if (!category) {
    return <Text style={styles.error}>Unknown content type</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>{category.icon} {category.label}</Text>
      {posts.length === 0 && <Text style={styles.empty}>No posts yet.</Text>}
      {posts.map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.title}>{p.title}</Text>
          <Text style={styles.meta}>{new Date(p.createdAt).toLocaleDateString()} · {p.author.name}</Text>
          {p.mediaUrl && type !== 'video' && (
            <Image source={{ uri: p.mediaUrl }} style={styles.image} resizeMode="cover" />
          )}
          {p.mediaUrl && type === 'video' && (
            <Text style={styles.videoHint}>Video: {p.mediaUrl}</Text>
          )}
          <Text style={styles.body}>{p.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  empty: { color: colors.muted },
  error: { padding: 16, color: colors.danger },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  title: { fontWeight: '600', color: colors.primary, fontSize: 16 },
  meta: { color: colors.muted, fontSize: 12, marginVertical: 4 },
  body: { color: colors.text, marginTop: 6, lineHeight: 20 },
  image: { width: '100%', height: 180, borderRadius: 8, marginVertical: 8 },
  videoHint: { color: colors.muted, fontSize: 12, marginVertical: 4 },
});
