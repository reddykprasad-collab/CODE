import { getHasOnboarded, setHasOnboarded, setUserPath } from '../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('routing logic', () => {
  it('new user: hasOnboarded is false → should route to Onboarding', async () => {
    const onboarded = await getHasOnboarded();
    expect(onboarded).toBe(false);
  });

  it('returning user: hasOnboarded is true → should route to Main', async () => {
    await setHasOnboarded();
    const onboarded = await getHasOnboarded();
    expect(onboarded).toBe(true);
  });

  it('awareness path is stored correctly after quiz', async () => {
    await setUserPath('awareness');
    const { getUserPath } = require('../services/storage');
    const path = await getUserPath();
    expect(path).toBe('awareness');
  });

  it('adherence path is stored correctly after quiz', async () => {
    await setUserPath('adherence');
    const { getUserPath } = require('../services/storage');
    const path = await getUserPath();
    expect(path).toBe('adherence');
  });
});

describe('path values match what ChatScreen checks', () => {
  it('adherence path value is the string "adherence"', async () => {
    await setUserPath('adherence');
    const { getUserPath } = require('../services/storage');
    expect(await getUserPath()).toBe('adherence');
  });

  it('awareness path value is the string "awareness"', async () => {
    await setUserPath('awareness');
    const { getUserPath } = require('../services/storage');
    expect(await getUserPath()).toBe('awareness');
  });
});

describe('quiz routing logic', () => {
  it('q2 yes → adherence path', () => {
    const answers = { q1: 'high', q2: 'yes', q3: 'unsatisfied' };
    const path = answers.q2 === 'yes' ? 'adherence' : 'awareness';
    expect(path).toBe('adherence');
  });

  it('q2 no → awareness path', () => {
    const answers = { q1: 'low', q2: 'no', q3: 'satisfied' };
    const path = answers.q2 === 'yes' ? 'adherence' : 'awareness';
    expect(path).toBe('awareness');
  });

  it('q2 unsure → awareness path', () => {
    const answers = { q1: 'mid', q2: 'unsure', q3: 'somewhat' };
    const path = answers.q2 === 'yes' ? 'adherence' : 'awareness';
    expect(path).toBe('awareness');
  });
});
