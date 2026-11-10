// Подтверждение удаления записи дневника (урок из отзывов конкурента —
// скриншоты Кати от 11.11: отзыв Иришки, RuStore 3 звезды, про правку и
// удаление «ингредиентов»; ранее в нашем дневнике корзина удаляла запись
// МГНОВЕННО — случайный тап по ней терял блюдо без возврата).
// Диалог с «Отмена» защищает от случайности, намеренное удаление —
// по-прежнему в один тап по «Удалить». Используется в строках дневника:
// MealPlanCard (секции на Главной) и AllMealsModal («Все приёмы пищи»).

import { Alert } from 'react-native'
import { formatNum } from './format'

export function confirmRemoveEntry({ removeEntry, mealId, entry, mealName, toast }) {
  Alert.alert(
    'Удалить запись?',
    `${entry.emoji || '🍽️'} ${entry.name} — ${
      entry.grams > 0 ? `${entry.grams} г · ` : ''
    }${formatNum(entry.kcal)} ккал${mealName ? ` · «${mealName}»` : ''}`,
    [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          removeEntry(mealId, entry.id)
          if (toast)
            toast({
              title: '🗑 Запись удалена',
              description: `${entry.name} больше не в дневнике`,
            })
        },
      },
    ]
  )
}
