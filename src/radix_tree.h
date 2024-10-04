#ifndef __RAX_TREE_H
#define __RAX_TREE_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>
#include <stdio.h>
#include <ctype.h>
#include "rax/rax.h"

typedef rax radix_tree;
typedef raxIterator radix_iterator;

typedef struct {
    size_t          len;
    unsigned char* buf;
} rt_str_t;

radix_tree *raxtree_new();
int raxtree_destroy(radix_tree* t);
int raxtree_insert(radix_tree* t, const rt_str_t *buf, int idx);

void *raxtree_find(radix_tree* t, const rt_str_t *buf);
void *raxtree_search(radix_tree* t, radix_iterator* it, const rt_str_t *buf);

radix_iterator* raxtree_new_it(radix_tree* t);
int raxtree_prev(radix_iterator* it, const rt_str_t *buf);
int raxtree_next(radix_iterator* it, const rt_str_t *buf);
int raxtree_up(radix_iterator* it, const rt_str_t *buf);
int raxtree_stop(radix_iterator* it);
int raxtree_remove(radix_tree* t, rt_str_t *buf);

#ifdef __cplusplus
}
#endif

#endif
